
import React, { useEffect, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { jsPDF } from "jspdf";
import { Story } from '../types';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { generateSpeech, generateChapterIllustration } from '../services/geminiService';
import AudioPlayer from '../components/AudioPlayer';
import { dbService } from '../services/dbService';

const { useParams, useNavigate } = ReactRouterDOM;

const StoryReader: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [story, setStory] = useState<Story | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [processingDownload, setProcessingDownload] = useState(false);

  // --- ACTIONS ---

  const saveProgress = async () => {
      if (!story || !user) return;
      try {
        await dbService.updateStory(user.id, story);
      } catch (e) {
        console.error("Erro ao salvar progresso:", e);
      }
  };

  const handleExit = async () => {
    await saveProgress();
    if (user?.isSchoolUser || story?.isEducational) {
        navigate('/school-library');
    } else {
        navigate('/library');
    }
  };

  const updateStoryInDB = async (updatedStory: Story) => {
      if (!user) return;
      try {
          await dbService.updateStory(user.id, updatedStory);
      } catch (e) {
          console.error("Erro db:", e);
      }
  };

  useEffect(() => {
    if (!id || !user) return;
    
    let attempts = 0;
    const loadStory = async () => {
        try {
            const found = await dbService.getStoryById(user.id, id);
            if (found) {
                setStory(found);
                setLoadError(false);
            } else {
                if (attempts < 5) {
                    attempts++;
                    setTimeout(loadStory, 800);
                } else {
                    setLoadError(true);
                }
            }
        } catch (e) {
            console.error(e);
            setLoadError(true);
        }
    };
    loadStory();
  }, [id, user]);

  // Geração automática de imagens ao mudar de capítulo
  useEffect(() => {
    if (story && story.chapters && story.chapters[activeChapterIndex]) {
      const chapter = story.chapters[activeChapterIndex];
      if (!chapter.generatedImage) {
        const genImage = async () => {
            try {
                const charsDesc = story.characters ? story.characters.map(c => `${c.name} (${c.description})`).join(', ') : '';
                const imageUrl = generateChapterIllustration(chapter.visualDescription, charsDesc);
                
                const updatedChapters = [...story.chapters];
                updatedChapters[activeChapterIndex] = { ...chapter, generatedImage: imageUrl };
                
                const updatedStory = { ...story, chapters: updatedChapters };
                setStory(updatedStory);
                updateStoryInDB(updatedStory);
            } catch (e) {
                console.error("Erro ao gerar imagem (não crítico):", e);
            }
        }
        genImage();
      }
    }
  }, [activeChapterIndex, story?.id]);

  const handleGenerateAudio = async () => {
    if (!story || !story.chapters) return;
    const currentChapter = story.chapters[activeChapterIndex];
    if (currentChapter.generatedAudio) return;
    
    setGeneratingAudio(true);
    try {
      const audioBase64 = await generateSpeech(currentChapter.text);
      const updatedChapters = [...story.chapters];
      updatedChapters[activeChapterIndex] = { ...currentChapter, generatedAudio: audioBase64 };
      const updatedStory = { ...story, chapters: updatedChapters };
      setStory(updatedStory);
      updateStoryInDB(updatedStory);
    } catch (error: any) {
      console.error(error);
      alert(`Erro na narração: ${error.message || 'Falha na conexão com IA'}`);
    } finally {
      setGeneratingAudio(false);
    }
  };

  // --- DOWNLOAD FUNCIONALITIES ---

  const decodeBase64ToBytes = (base64: string): Uint8Array => {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
  };

  const downloadFullAudio = async () => {
    if (!story || !story.chapters) return;

    setProcessingDownload(true);
    try {
        const audioBuffers: Uint8Array[] = [];
        let totalLength = 0;

        // 1. Gather all audio
        for (const chapter of story.chapters) {
            if (!chapter.generatedAudio) {
                alert("Alguns capítulos ainda não têm áudio. Gerando agora...");
                const newAudio = await generateSpeech(chapter.text);
                chapter.generatedAudio = newAudio;
            }
            const bytes = decodeBase64ToBytes(chapter.generatedAudio!);
            audioBuffers.push(bytes);
            totalLength += bytes.length;
        }

        // 2. Concatenate raw PCM
        const mergedBuffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const buffer of audioBuffers) {
            mergedBuffer.set(buffer, offset);
            offset += buffer.length;
        }

        // 3. Create WAV Header
        const wavHeader = new ArrayBuffer(44);
        const view = new DataView(wavHeader);
        const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const fileSize = 36 + mergedBuffer.length;

        writeString(0, 'RIFF');
        view.setUint32(4, fileSize, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
        view.setUint16(32, numChannels * (bitsPerSample / 8), true);
        view.setUint16(34, bitsPerSample, true);
        writeString(36, 'data');
        view.setUint32(40, mergedBuffer.length, true);

        // 4. Download
        const blob = new Blob([wavHeader, mergedBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CineastaKids_${story.title.replace(/\s+/g, '_')}_AudioCompleto.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Erro ao gerar áudio completo:", e);
        alert("Erro ao criar o áudio completo.");
    } finally {
        setProcessingDownload(false);
    }
  };

  const downloadPDF = async () => {
    if (!story || !story.chapters) return;
    setProcessingDownload(true);

    try {
        // Inicializa PDF em formato Paisagem A4
        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // --- CAPA DIVERTIDA ---
        
        // Fundo Azul Turquesa
        doc.setFillColor(64, 224, 208); // Cartoon Blue
        doc.rect(0, 0, pageWidth, pageHeight, "F");

        // Bolinhas Decorativas (Polka Dots)
        doc.setFillColor(255, 255, 255); // Branco
        for(let x=0; x<pageWidth; x+=30) {
            for(let y=0; y<pageHeight; y+=30) {
                if((x+y)%60 === 0) doc.circle(x, y, 3, "F");
            }
        }

        // Cartão Central Branco (Moldura)
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1.5);
        doc.setFillColor(255, 255, 255);
        // Rounded Rect simulado
        doc.roundedRect(30, 20, pageWidth - 60, pageHeight - 40, 10, 10, "FD");

        // Título
        doc.setFont("helvetica", "bold");
        doc.setFontSize(40);
        doc.setTextColor(255, 69, 0); // Cartoon Orange
        
        // Quebra título se for muito grande
        const splitTitle = doc.splitTextToSize(story.title.toUpperCase(), pageWidth - 80);
        doc.text(splitTitle, pageWidth / 2, 70, { align: "center" });

        // Autor
        doc.setFontSize(18);
        doc.setTextColor(100, 100, 100);
        doc.text(`Uma produção de:`, pageWidth / 2, pageHeight - 65, { align: "center" });
        
        doc.setFontSize(24);
        doc.setTextColor(0, 0, 0);
        doc.text(`${user?.name || 'Cineasta Kids'}`, pageWidth / 2, pageHeight - 55, { align: "center" });

        // Imagem Central da Capa (se houver)
        if (story.characters && story.characters[0]) {
             try {
                const imgData = await fetchImageAsBase64(story.characters[0].imageUrl);
                // Moldura de foto polaroid
                doc.setFillColor(255, 255, 255);
                doc.rect((pageWidth/2) - 35, 90, 70, 85, "F"); // Fundo branco
                doc.addImage(imgData, 'JPEG', (pageWidth/2) - 30, 95, 60, 60);
                // "Clip" tape visual decoration (retângulo simples inclinado seria complexo aqui, vamos simplificar)
             } catch(e) {}
        }
        
        // Selo Cineasta Kids
        doc.setFontSize(12);
        doc.setTextColor(150, 150, 150);
        doc.text("Criado com Cineasta Kids App", pageWidth / 2, pageHeight - 30, { align: "center" });

        // --- PÁGINAS DA HISTÓRIA ---
        
        for (let i = 0; i < story.chapters.length; i++) {
            const chapter = story.chapters[i];
            doc.addPage();
            
            // Fundo Amarelo Pastel (Cream)
            doc.setFillColor(255, 250, 205); 
            doc.rect(0, 0, pageWidth, pageHeight, "F");
            
            // Moldura Tracejada
            doc.setDrawColor(255, 105, 180); // Hot Pink
            doc.setLineWidth(1);
            doc.setLineDashPattern([5, 5], 0);
            doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
            doc.setLineDashPattern([], 0); // Reset

            // Layout: Imagem Esquerda, Texto Direita (ou vice-versa dependendo do indice para dinamismo)
            const isEven = i % 2 === 0;
            
            // Áreas
            const margin = 25;
            const contentWidth = (pageWidth - (margin * 3)) / 2;
            
            const imgX = isEven ? margin : margin * 2 + contentWidth;
            const textX = isEven ? margin * 2 + contentWidth : margin;
            const centerY = pageHeight / 2;

            // Imagem "Polaroid"
            if (chapter.generatedImage) {
                try {
                    const imgBase64 = await fetchImageAsBase64(chapter.generatedImage);
                    // Fundo branco da polaroid
                    doc.setFillColor(255, 255, 255);
                    doc.setDrawColor(0,0,0);
                    doc.setLineWidth(0.5);
                    doc.rect(imgX - 5, 40 - 5, contentWidth + 10, 100 + 20, "FD"); // Borda branca
                    
                    doc.addImage(imgBase64, "JPEG", imgX, 40, contentWidth, 100);
                } catch (e) {
                    doc.text("Imagem...", imgX + 20, 80);
                }
            }

            // Título do Capítulo
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(128, 0, 128); // Roxo
            doc.text(chapter.title, textX + (contentWidth/2), 50, { align: "center", maxWidth: contentWidth });

            // Texto da História
            doc.setFont("courier", "normal"); // Fonte mais "máquina de escrever" ou livro
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            
            const splitText = doc.splitTextToSize(chapter.text, contentWidth);
            doc.text(splitText, textX, 75);
            
            // Paginação (Bolinha colorida no canto)
            doc.setFillColor(255, 215, 0); // Gold
            doc.circle(pageWidth - 20, pageHeight - 20, 8, "F");
            doc.setTextColor(0,0,0);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(`${i + 1}`, pageWidth - 20, pageHeight - 19, { align: "center" });
        }

        doc.save(`Livro_${story.title.replace(/\s+/g, '_')}.pdf`);

    } catch (e) {
        console.error("Erro ao gerar PDF:", e);
        alert("Erro ao criar o PDF. Tente novamente.");
    } finally {
        setProcessingDownload(false);
    }
  };

  const fetchImageAsBase64 = async (url: string): Promise<string> => {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });
  };

  if (loadError) return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center font-heading gap-4">
          <div className="text-4xl text-cartoon-orange">Ops!</div>
          <div className="text-2xl">História não encontrada.</div>
          <Button onClick={() => navigate('/create-story')}>Voltar</Button>
      </div>
  );
  
  if (!story || !story.chapters) return <div className="min-h-[60vh] flex items-center justify-center font-heading text-3xl animate-pulse">Abrindo livro...</div>;

  const isFinished = activeChapterIndex >= story.chapters.length;
  const currentChapter = story.chapters[activeChapterIndex] || story.chapters[story.chapters.length-1];

  return (
    <div className={`max-w-5xl mx-auto px-4 pb-20 ${story.isEducational ? 'font-sans' : ''}`}>
      
      {isFinished ? (
          <div className="min-h-[80vh] flex items-center justify-center flex-col gap-6 p-4 relative z-50">
               <Card color={story.isEducational ? 'green' : 'yellow'} className="text-center p-8 md:p-12 max-w-2xl w-full border-[6px] shadow-2xl animate-fade-in">
                   <h1 className="font-heading text-4xl md:text-5xl mb-4">Fim da Aventura!</h1>
                   
                   <div className="grid grid-cols-1 gap-4 w-full max-w-md mx-auto mb-8">
                       <Button 
                            variant="primary" 
                            onClick={downloadPDF} 
                            disabled={processingDownload}
                            className="w-full text-xl py-4 flex items-center justify-center gap-2"
                        >
                            {processingDownload ? 'Criando livro...' : '📚 Baixar Livro em PDF'}
                       </Button>
                       
                       <Button 
                            variant="secondary" 
                            onClick={downloadFullAudio} 
                            disabled={processingDownload}
                            className="w-full text-xl py-4 flex items-center justify-center gap-2"
                       >
                            {processingDownload ? 'Processando áudio...' : '🎵 Baixar Áudio Completo'}
                       </Button>
                   </div>

                   <div className="flex flex-col gap-4 justify-center border-t-2 border-black/10 pt-6">
                       <Button variant="secondary" onClick={() => setActiveChapterIndex(0)}>📖 Ler Novamente</Button>
                       <Button variant="danger" onClick={handleExit} size="sm" className="mt-2 border-dashed">🚪 Salvar e Sair</Button>
                   </div>
               </Card>
          </div>
      ) : (
          <>
            <div className="mb-6 bg-white rounded-2xl border-4 border-black p-4 shadow-cartoon flex flex-col md:flex-row items-center justify-between gap-4 relative z-20">
                <div>
                    <h1 className="font-heading text-3xl text-cartoon-purple">{story.title}</h1>
                    <div className="text-gray-500 font-bold">Capítulo {activeChapterIndex + 1} de {story.chapters.length}</div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="danger" onClick={handleExit}>❌ Salvar e Sair</Button>
                </div>
            </div>

            <div className="grid md:grid-cols-12 gap-8">
                <div className="md:col-span-12">
                <Card className="min-h-[500px] flex flex-col bg-white" color="white">
                    <div className="w-full h-64 md:h-96 mb-8 rounded-xl border-4 border-black overflow-hidden bg-gray-100 relative shadow-inner">
                        {currentChapter.generatedImage ? (
                            <img src={currentChapter.generatedImage} className="w-full h-full object-cover animate-fade-in" crossOrigin="anonymous" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 flex-col"><span className="text-4xl animate-bounce">🎨</span><span>Ilustrando...</span></div>
                        )}
                    </div>

                    <div className="flex-grow">
                        <h2 className="font-heading text-3xl mb-4 text-black">{currentChapter.title}</h2>
                        <div className="font-sans text-xl md:text-2xl text-gray-800 leading-loose mb-8">
                            {currentChapter.text.split('\n').map((p, i) => <p key={i} className="mb-4">{p}</p>)}
                        </div>
                    </div>

                    <div className="border-t-4 border-gray-100 border-dashed pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="w-full md:w-auto">
                            {currentChapter.generatedAudio ? (
                                <AudioPlayer base64Audio={currentChapter.generatedAudio} />
                            ) : (
                                <Button onClick={handleGenerateAudio} disabled={generatingAudio} variant="secondary" size="sm" loading={generatingAudio}>🔊 Narrar</Button>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <Button onClick={() => setActiveChapterIndex(p => Math.max(0, p - 1))} disabled={activeChapterIndex === 0} variant="secondary">⬅️</Button>
                            <Button 
                                onClick={() => setActiveChapterIndex(p => p + 1)} 
                                variant={activeChapterIndex < story.chapters.length - 1 ? "primary" : "success"}
                            >
                                {activeChapterIndex < story.chapters.length - 1 ? 'Próxima ➡️' : 'FINALIZAR 🎉'}
                            </Button>
                        </div>
                    </div>
                </Card>
                </div>
            </div>
          </>
      )}
    </div>
  );
};

export default StoryReader;
