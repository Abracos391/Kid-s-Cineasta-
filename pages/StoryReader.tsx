
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Story } from '../types';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { generateSpeech, generateChapterIllustration } from '../services/geminiService';
import AudioPlayer from '../components/AudioPlayer';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '../services/supabaseClient';
import { uploadAsset } from '../services/storageService';

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
    await new Promise(r => setTimeout(r, 500)); 

    try {
      const bookContainer = bookPrintRef.current;
      if (!bookContainer) throw new Error("Erro de layout");

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = bookContainer.querySelectorAll('.book-page');
      
      for (let i = 0; i < pages.length; i++) {
          setPdfProgress(10 + Math.floor(((i + 1) / pages.length) * 80));
          const pageEl = pages[i] as HTMLElement;
          const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, logging: false });
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

  // --- SAVE LOGIC ---
  const updateChapterInDB = async (storyId: string, updatedChapters: any[]) => {
      // Salva no Supabase
      await supabase.from('stories').update({
          chapters: updatedChapters
      }).eq('id', storyId);
  };

  // --- LOAD ---
  useEffect(() => {
    if (!id) return;
    
    const fetchStory = async () => {
        // Tenta buscar no Supabase primeiro
        const { data, error } = await supabase.from('stories').select('*').eq('id', id).single();
        
        if (data) {
            setStory({
                id: data.id,
                title: data.title,
                theme: data.theme,
                createdAt: data.created_at,
                isPremium: data.is_premium,
                isEducational: data.is_educational,
                educationalGoal: data.educational_goal,
                chapters: data.chapters,
                characters: data.characters
            });
            setLoadError(false);
        } else {
            // Fallback para cache local temporário se acabou de criar
            const current = localStorage.getItem('currentStory');
            if (current) {
                const parsed = JSON.parse(current);
                if (String(parsed.id) === String(id)) {
                    setStory(parsed);
                    setLoadError(false);
                    return;
                }
            }
            setLoadError(true);
        }
    };
    fetchStory();
  }, [id]);

  // --- IMAGE GENERATION ---
  useEffect(() => {
    if (story && story.chapters && story.chapters[activeChapterIndex]) {
      const chapter = story.chapters[activeChapterIndex];
      if (!chapter.generatedImage) {
        const genImage = async () => {
            const charsDesc = story.characters ? story.characters.map(c => `${c.name} (${c.description})`).join(', ') : '';
            const imageUrl = generateChapterIllustration(chapter.visualDescription, charsDesc);
            
            // Pollinations já é URL, mas podemos salvar no bucket para persistencia garantida se quisermos
            // Por enquanto, salvamos a URL direta pois é rápido
            
            const updatedChapters = [...story.chapters];
            updatedChapters[activeChapterIndex] = { ...chapter, generatedImage: imageUrl };
            
            setStory(prev => prev ? ({ ...prev, chapters: updatedChapters }) : null);
            await updateChapterInDB(story.id, updatedChapters);
        }
        genImage();
      }
    }
  }, [activeChapterIndex, story?.id]);

  // --- AUDIO GENERATION ---
  const handleGenerateAudio = async () => {
    if (!story || !story.chapters) return;
    const currentChapter = story.chapters[activeChapterIndex];
    if (currentChapter.generatedAudio) return;
    
    setGeneratingAudio(true);
    try {
      // 1. Gera base64
      const audioBase64 = await generateSpeech(currentChapter.text);
      
      // 2. UPLOAD para Supabase Storage (Adeus erro de memória!)
      const fileName = `${story.id}_ch${activeChapterIndex}_${Date.now()}.wav`;
      const publicUrl = await uploadAsset(audioBase64, 'audio', fileName);
      
      const updatedChapters = [...story.chapters];
      // Salva a URL, não o base64
      updatedChapters[activeChapterIndex] = { ...currentChapter, generatedAudio: audioBase64 }; // Mantem base64 no estado local para tocar na hora
      
      // Salva URL no Banco
      const chaptersForDB = [...story.chapters];
      chaptersForDB[activeChapterIndex] = { ...currentChapter, generatedAudio: publicUrl }; 
      
      setStory(prev => prev ? ({ ...prev, chapters: updatedChapters }) : null); // Update UI
      await updateChapterInDB(story.id, chaptersForDB); // Update DB

    } catch (error) {
      console.error(error);
      alert("Erro ao gerar áudio.");
    } finally {
      setGeneratingAudio(false);
    }
  };

  // --- RENDER ---

  if (loadError) return <div className="min-h-[60vh] flex items-center justify-center font-heading text-4xl">História não encontrada.</div>;
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
                           {generatingPDF ? 'Imprimindo...' : '📚 Baixar PDF Completo'}
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
      
      {/* HIDDEN PRINT LAYOUT */}
      <div ref={bookPrintRef} style={{ position: 'fixed', top: 0, left: generatingPDF ? '0' : '-10000px', zIndex: -10, width: '794px' }}>
         <div className={`book-page relative w-[794px] h-[1123px] overflow-hidden border-8 border-black flex flex-col items-center justify-between p-12 ${story.isEducational ? 'bg-[#1a3c28]' : 'bg-cartoon-yellow'}`}>
             <div className="z-10 text-center w-full mt-10">
                <h1 className={`font-comic text-7xl drop-shadow-lg mb-4 ${story.isEducational ? 'text-white' : 'text-cartoon-blue text-stroke-3'}`}>{story.title}</h1>
             </div>
             <div className="z-10 w-[550px] h-[550px] bg-white border-[6px] border-black rounded-lg overflow-hidden shadow-2xl">
                 {story.chapters[0].generatedImage && <img src={story.chapters[0].generatedImage} className="w-full h-full object-cover" crossOrigin="anonymous" />}
             </div>
             <div className="z-10 text-center w-full mb-10 bg-white border-4 border-black p-4 rounded-xl">
                 <p className="font-comic text-4xl text-black">Autor: {user?.name}</p>
             </div>
        </div>
        {story.chapters.map((chapter, idx) => (
            <div key={idx} className="book-page w-[794px] h-[1123px] bg-white border-8 border-black flex flex-col">
                <div className="h-1/2 border-b-8 border-black relative overflow-hidden">
                    {chapter.generatedImage && <img src={chapter.generatedImage} className="w-full h-full object-cover" crossOrigin="anonymous" />}
                </div>
                <div className="h-1/2 p-12 flex flex-col justify-center bg-cartoon-cream">
                    <h2 className="font-heading text-4xl mb-6 text-cartoon-purple text-center">{chapter.title}</h2>
                    <p className="font-sans text-3xl leading-relaxed text-justify">{chapter.text}</p>
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
            <Button size="sm" variant="primary" onClick={handleFullBookDownload} disabled={generatingPDF}>📚 PDF</Button>
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
