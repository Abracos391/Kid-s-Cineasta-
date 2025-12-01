
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Story } from '../types';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { generateSpeech, generateChapterIllustration } from '../services/geminiService';
import AudioPlayer from '../components/AudioPlayer';
import { dbService } from '../services/dbService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const StoryReader: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const bookPrintRef = useRef<HTMLDivElement>(null);
  
  const [story, setStory] = useState<Story | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0); 
  const [loadError, setLoadError] = useState(false);
  
  const [stitchingAudio, setStitchingAudio] = useState(false);

  // --- ACTIONS ---

  const handleExit = () => {
    if (user?.isSchoolUser || story?.isEducational) {
        navigate('/school-library');
    } else {
        navigate('/library');
    }
  };

  const handleFullBookDownload = async () => {
    if (!story) return;
    setGeneratingPDF(true);
    setPdfProgress(10);

    try {
      const bookContainer = bookPrintRef.current;
      if (!bookContainer) throw new Error("Erro de layout");

      setPdfProgress(20);
      await new Promise(r => setTimeout(r, 2000));

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = bookContainer.querySelectorAll('.book-page');
      
      for (let i = 0; i < pages.length; i++) {
          setPdfProgress(20 + Math.floor(((i + 1) / pages.length) * 80));
          const pageEl = pages[i] as HTMLElement;
          
          const canvas = await html2canvas(pageEl, { 
              scale: 2, 
              useCORS: true, 
              logging: false,
              allowTaint: true,
              backgroundColor: null 
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 0.9);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }
      setPdfProgress(100);
      pdf.save(`${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    } catch (error) {
        console.error(error);
        alert("Erro ao gerar PDF.");
    } finally {
        setGeneratingPDF(false);
    }
  };

  const downloadUnifiedAudio = async () => {
      if (!story || !story.chapters) return;
      const missingAudio = story.chapters.some(c => !c.generatedAudio);
      if (missingAudio) {
          alert("Gere a narração de todos os capítulos antes de baixar o áudio completo.");
          return;
      }
      setStitchingAudio(true);
      try {
          const chunks = story.chapters.map(c => {
              const binary = atob(c.generatedAudio!);
              const len = binary.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
              return bytes;
          });
          const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const combinedBuffer = new Uint8Array(44 + totalLength);
          const view = new DataView(combinedBuffer.buffer);
          const writeString = (offset: number, s: string) => {
              for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
          };
          const sampleRate = 24000;
          const numChannels = 1;
          const bitsPerSample = 16;
          const dataLength = totalLength;
          const fileSize = 36 + dataLength;

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
          view.setUint32(40, dataLength, true);

          let offset = 44;
          chunks.forEach(chunk => {
              combinedBuffer.set(chunk, offset);
              offset += chunk.length;
          });

          const blob = new Blob([combinedBuffer], { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${story.title}_Audiobook_Completo.wav`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      } catch (e) {
          console.error("Erro ao criar arquivo único:", e);
          alert("Erro ao unificar áudios.");
      } finally {
          setStitchingAudio(false);
      }
  };

  const updateStoryInDB = async (updatedStory: Story) => {
      if (!user) return;
      try {
          await dbService.updateStory(user.id, updatedStory);
      } catch (e) {
          console.error("Erro ao atualizar história no banco:", e);
      }
  };

  // --- LOAD WITH RETRY ---
  useEffect(() => {
    if (!id || !user) return;
    
    let attempts = 0;
    const maxAttempts = 3;

    const loadStory = async () => {
        try {
            const found = await dbService.getStoryById(user.id, id);
            if (found) {
                setStory(found);
                setLoadError(false);
            } else {
                if (attempts < maxAttempts) {
                    attempts++;
                    // Se não achou, tenta de novo em 500ms (Race condition fix)
                    setTimeout(loadStory, 500);
                } else {
                    setLoadError(true);
                }
            }
        } catch (e) {
            console.error(e);
            if (attempts < maxAttempts) {
                attempts++;
                setTimeout(loadStory, 500);
            } else {
                setLoadError(true);
            }
        }
    };
    loadStory();
  }, [id, user]);

  useEffect(() => {
    if (story && story.chapters && story.chapters[activeChapterIndex]) {
      const chapter = story.chapters[activeChapterIndex];
      if (!chapter.generatedImage) {
        const genImage = async () => {
            const charsDesc = story.characters ? story.characters.map(c => `${c.name} (${c.description})`).join(', ') : '';
            const imageUrl = generateChapterIllustration(chapter.visualDescription, charsDesc);
            
            const updatedChapters = [...story.chapters];
            updatedChapters[activeChapterIndex] = { ...chapter, generatedImage: imageUrl };
            
            const updatedStory = { ...story, chapters: updatedChapters };
            setStory(updatedStory);
            updateStoryInDB(updatedStory);
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

    } catch (error) {
      console.error(error);
      alert("Erro ao gerar áudio.");
    } finally {
      setGeneratingAudio(false);
    }
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

  if (isFinished) {
      return (
          <div className="min-h-[80vh] flex items-center justify-center flex-col gap-6 p-4 relative z-50">
               <Card color={story.isEducational ? 'green' : 'yellow'} className="text-center p-8 md:p-12 max-w-2xl w-full border-[6px] shadow-2xl animate-fade-in">
                   <h1 className="font-heading text-4xl md:text-5xl mb-4">Fim da Aventura!</h1>
                   <div className="flex flex-col gap-4 justify-center">
                       <Button variant="primary" onClick={() => setActiveChapterIndex(0)}>📖 Ler do Início</Button>
                       <Button variant="secondary" onClick={handleFullBookDownload} disabled={generatingPDF}>
                           {generatingPDF ? `Imprimindo... ${pdfProgress}%` : '📄 Baixar Livro em PDF'}
                       </Button>
                       <Button variant="success" onClick={downloadUnifiedAudio} disabled={stitchingAudio}>
                            {stitchingAudio ? 'Unificando Áudios...' : '🎧 Baixar Audiobook Completo (.WAV)'}
                       </Button>
                       <Button variant="danger" onClick={handleExit}>🚪 Voltar para Biblioteca</Button>
                   </div>
               </Card>
          </div>
      );
  }

  const currentChapter = story.chapters[activeChapterIndex];

  return (
    <div className={`max-w-5xl mx-auto px-4 pb-20 ${story.isEducational ? 'font-sans' : ''}`}>
      
      <div 
        ref={bookPrintRef} 
        style={{ 
            position: 'fixed', 
            top: 0, 
            left: generatingPDF ? '0' : '-10000px',
            zIndex: -50,
            width: '794px',
            opacity: generatingPDF ? 1 : 0, 
            pointerEvents: 'none',
            backgroundColor: 'white' 
        }}
      >
         <div className={`book-page relative w-[794px] h-[1123px] overflow-hidden border-8 border-black flex flex-col items-center justify-between p-12 ${story.isEducational ? 'bg-[#1a3c28]' : 'bg-cartoon-yellow'}`}>
             <div className="z-10 text-center w-full mt-10">
                <h1 className={`font-comic text-7xl drop-shadow-lg mb-4 text-center leading-tight ${story.isEducational ? 'text-white' : 'text-cartoon-blue text-stroke-3'}`}>{story.title}</h1>
             </div>
             <div className="z-10 w-[550px] h-[550px] bg-white border-[6px] border-black rounded-lg overflow-hidden shadow-2xl">
                 {story.chapters[0].generatedImage && <img src={story.chapters[0].generatedImage} className="w-full h-full object-cover" crossOrigin="anonymous" />}
             </div>
             <div className="z-10 text-center w-full mb-10 bg-white border-4 border-black p-4 rounded-xl">
                 <p className="font-comic text-4xl text-black">Autor: {user?.name}</p>
                 {story.isEducational && <p className="font-sans text-xl mt-2 font-bold">Material Didático - Cineasta Kids</p>}
             </div>
        </div>
        
        {story.chapters.map((chapter, idx) => (
            <div key={idx} className="book-page w-[794px] h-[1123px] bg-white border-8 border-black flex flex-col">
                <div className="h-1/2 border-b-8 border-black relative overflow-hidden bg-gray-100">
                    {chapter.generatedImage && <img src={chapter.generatedImage} className="w-full h-full object-cover" crossOrigin="anonymous" />}
                </div>
                <div className="h-1/2 p-12 pt-8 flex flex-col justify-start items-start bg-cartoon-cream overflow-hidden">
                    <h2 className="font-heading text-4xl mb-6 text-cartoon-purple w-full text-center border-b-2 border-black/10 pb-2">{chapter.title}</h2>
                    <div className="flex justify-start items-start w-full h-full">
                         <p className="font-sans text-2xl leading-normal text-justify w-full text-gray-900 font-medium">
                            {chapter.text}
                        </p>
                    </div>
                </div>
            </div>
        ))}
      </div>

      <div className="mb-6 bg-white rounded-2xl border-4 border-black p-4 shadow-cartoon flex flex-col md:flex-row items-center justify-between gap-4 relative z-20">
        <div>
            <h1 className="font-heading text-3xl text-cartoon-purple">{story.title}</h1>
            <div className="text-gray-500 font-bold">Página {activeChapterIndex + 1} de {story.chapters.length}</div>
        </div>
        <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={handleFullBookDownload} disabled={generatingPDF}>
                {generatingPDF ? '⏳' : '📄 PDF'}
            </Button>
            <Button size="sm" variant="danger" onClick={handleExit}>❌ Sair</Button>
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
    </div>
  );
};

export default StoryReader;
