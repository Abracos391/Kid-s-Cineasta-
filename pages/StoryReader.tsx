
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Story } from '../types';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { generateSpeech, generateChapterIllustration } from '../services/geminiService';
import AudioPlayer from '../components/AudioPlayer';
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
  const [storageWarning, setStorageWarning] = useState(false);

  // --- FUNÇÕES DE AÇÃO (Definidas antes de qualquer return) ---

  const handleExit = () => {
    // Redirecionamento inteligente: Se for usuário escolar OU a história for educacional, vai pra biblioteca escolar
    if (user?.isSchoolUser || story?.isEducational) {
        navigate('/school-library');
    } else {
        navigate('/library');
    }
  };

  const handleFullBookDownload = async () => {
    if (!story) return;

    const isAllowed = story.isPremium === true || user?.plan === 'premium' || story.isEducational === true;
    if (!isAllowed && user?.plan === 'free') {
      if(confirm("🔒 Download PDF exclusivo Premium. Deseja fazer upgrade?")) navigate('/pricing');
      return;
    }

    setGeneratingPDF(true);
    setPdfProgress(10);
    
    // Pequeno delay para garantir que o DOM renderizou o layout oculto
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

  // --- LÓGICA DE SALVAMENTO ---

  const saveSafely = (key: string, data: any) => {
      try {
          localStorage.setItem(key, JSON.stringify(data));
          setStorageWarning(false);
      } catch (e: any) {
          if (e.name === 'QuotaExceededError' || e.code === 22) {
              console.warn("Memória cheia. Tentando salvar versão compacta...");
              
              if (Array.isArray(data)) {
                  // Tenta compactar: remove assets de TODAS as histórias
                  const compacted = data.map((s: Story) => ({
                      ...s,
                      chapters: s.chapters.map(c => ({
                          ...c,
                          generatedAudio: undefined,
                          generatedImage: undefined
                      }))
                  }));
                  
                  try {
                      localStorage.setItem(key, JSON.stringify(compacted));
                      setStorageWarning(true); // Avisa o usuário mas salva o texto
                      return;
                  } catch (e2) {
                       console.error("Falha crítica no salvamento compacto.");
                  }
              }
              setStorageWarning(true);
          }
      }
  };

  const updateStoryInStorage = (updatedStory: Story) => {
    setStory(updatedStory);
    
    // 1. Atualiza cache atual (Prioridade Alta)
    try { localStorage.setItem('currentStory', JSON.stringify(updatedStory)); } catch(e){}

    // 2. Atualiza Arquivo Permanente
    const shouldSave = user?.plan === 'premium' || updatedStory.isEducational;
    if (shouldSave) {
        const savedStoriesRaw = localStorage.getItem('savedStories');
        let savedStories: Story[] = savedStoriesRaw ? JSON.parse(savedStoriesRaw) : [];
        
        const index = savedStories.findIndex(s => String(s.id) === String(updatedStory.id));
        
        if (index !== -1) {
            savedStories[index] = updatedStory;
        } else {
            savedStories.unshift(updatedStory);
        }
        
        saveSafely('savedStories', savedStories);
    }
  };

  // --- EFEITOS (Load e Generate) ---

  useEffect(() => {
    if (!id) return;
    
    // Tenta carregar do acervo
    const allStories: Story[] = JSON.parse(localStorage.getItem('savedStories') || '[]');
    let found = allStories.find(s => String(s.id) === String(id));
    
    // Se não achar, tenta carregar do cache imediato (Recém criada)
    if (!found) {
      const current = localStorage.getItem('currentStory');
      if (current) {
        try {
            const parsed = JSON.parse(current);
            if (String(parsed.id) === String(id)) found = parsed;
        } catch(e) { console.error("Cache inválido"); }
      }
    }
    
    if (found) {
        if (!found.chapters || found.chapters.length === 0) {
            setLoadError(true);
        } else {
            setStory(found);
            setLoadError(false);
        }
    } else {
        setLoadError(true);
    }
  }, [id]);

  useEffect(() => {
    if (story && story.chapters && story.chapters[activeChapterIndex]) {
      const chapter = story.chapters[activeChapterIndex];
      // Gera imagem se não existir
      if (!chapter.generatedImage) {
        const charsDesc = story.characters ? story.characters.map(c => `${c.name} (${c.description})`).join(', ') : '';
        const imageUrl = generateChapterIllustration(chapter.visualDescription, charsDesc);
        
        const updatedChapters = [...story.chapters];
        updatedChapters[activeChapterIndex] = { ...chapter, generatedImage: imageUrl };
        
        setStory(prev => {
            if (!prev) return null;
            const newStory = { ...prev, chapters: updatedChapters };
            // Debounce para evitar salvar a cada milissegundo
            setTimeout(() => updateStoryInStorage(newStory), 500);
            return newStory;
        });
      }
    }
  }, [activeChapterIndex, story?.id]); // Dependências controladas

  // --- RENDERIZAÇÃO DE ÁUDIO ---
  const handleGenerateAudio = async () => {
    if (!story || !story.chapters) return;
    const currentChapter = story.chapters[activeChapterIndex];

    const isAllowed = story.isPremium === true || user?.plan === 'premium' || story.isEducational === true;
    if (!isAllowed && user?.plan === 'free') {
        if(confirm("🔒 Narração exclusiva Premium. Deseja conhecer os planos?")) navigate('/pricing');
        return;
    }
    if (currentChapter.generatedAudio) return;
    
    setGeneratingAudio(true);
    try {
      const audioBase64 = await generateSpeech(currentChapter.text);
      const updatedChapters = [...story.chapters];
      updatedChapters[activeChapterIndex] = { ...currentChapter, generatedAudio: audioBase64 };
      updateStoryInStorage({ ...story, chapters: updatedChapters });
    } catch (error) {
      alert("Erro ao gerar áudio. Verifique sua conexão ou limpe o espaço do navegador.");
    } finally {
      setGeneratingAudio(false);
    }
  };


  // --- ESTADOS DE ERRO E CARREGAMENTO ---

  if (loadError) return (
      <div className="min-h-[60vh] flex items-center justify-center flex-col gap-6 text-center">
          <div className="text-8xl">⚠️</div>
          <h1 className="font-heading text-4xl text-white text-stroke-black">História não encontrada</h1>
          <p className="text-gray-700 font-bold bg-white p-2 rounded">O arquivo pode ter sido removido ou não foi salvo corretamente.</p>
          <Button variant="primary" onClick={handleExit}>Voltar à Biblioteca</Button>
      </div>
  );

  if (!story || !story.chapters) return (
    <div className="min-h-[60vh] flex items-center justify-center flex-col gap-4">
        <div className="animate-spin text-6xl">⏳</div>
        <div className="font-heading text-3xl text-white text-stroke-black">Abrindo o livro...</div>
    </div>
  );

  // --- TELA FINAL (THE END) ---
  const isFinished = activeChapterIndex >= story.chapters.length;

  if (isFinished) {
      return (
          <div className="min-h-[80vh] flex items-center justify-center flex-col gap-6 p-4 relative z-50">
               <Card color={story.isEducational ? 'green' : 'yellow'} className="text-center p-8 md:p-12 max-w-2xl w-full border-[6px] shadow-2xl animate-fade-in">
                   <div className="text-6xl mb-4">🎉</div>
                   <h1 className="font-heading text-4xl md:text-5xl mb-4">Fim da Aventura!</h1>
                   <p className="font-bold text-xl mb-8 text-gray-700">
                       {story.isEducational 
                        ? 'Aula concluída com sucesso!' 
                        : 'Que história incrível!'}
                   </p>
                   
                   <div className="flex flex-col gap-4 justify-center">
                       <Button variant="primary" onClick={() => setActiveChapterIndex(0)}>
                           📖 Ler do Início
                       </Button>
                       <Button variant="secondary" onClick={handleFullBookDownload} disabled={generatingPDF}>
                           {generatingPDF ? 'Imprimindo...' : '📚 Baixar PDF Completo'}
                       </Button>
                       <Button variant="danger" onClick={handleExit}>
                           {story.isEducational ? '🚪 Voltar para Biblioteca' : '🚪 Sair'}
                       </Button>
                   </div>
                   
                   {storageWarning && (
                       <p className="mt-6 text-red-600 text-xs font-bold bg-red-100 p-2 rounded border border-red-400">
                           Aviso: Memória cheia. O áudio pode não ter sido salvo, mas o texto da história está seguro na biblioteca.
                       </p>
                   )}
               </Card>
          </div>
      );
  }

  // --- RENDERIZAÇÃO DO CAPÍTULO ATUAL ---
  const currentChapter = story.chapters[activeChapterIndex];

  // Proteção extra
  if (!currentChapter) {
      return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-2xl font-bold text-white">Erro de paginação</h1>
            <Button onClick={handleExit} className="mt-4">Sair</Button>
        </div>
      );
  }

  return (
    <div className={`max-w-5xl mx-auto px-4 pb-20 ${story.isEducational ? 'font-sans' : ''}`}>
      
      {storageWarning && (
          <div className="fixed top-0 left-0 w-full bg-red-500 text-white text-center p-2 z-[100] font-bold animate-pulse shadow-md">
              ⚠️ Memória cheia! Os áudios não serão salvos permanentemente. Limpe histórias antigas.
          </div>
      )}

      {/* --- LAYOUT A4 OCULTO (Para PDF) --- */}
      <div ref={bookPrintRef} style={{ position: 'fixed', top: 0, left: generatingPDF ? '0' : '-10000px', zIndex: -10, width: '794px' }}>
        {/* CAPA */}
        <div className={`book-page relative w-[794px] h-[1123px] overflow-hidden border-8 border-black flex flex-col items-center justify-between p-12 ${story.isEducational ? 'bg-[#1a3c28]' : 'bg-cartoon-yellow'}`}>
             <div className="z-10 text-center w-full mt-10">
                <h1 className={`font-comic text-7xl drop-shadow-lg mb-4 ${story.isEducational ? 'text-white' : 'text-cartoon-blue text-stroke-3'}`}>{story.title}</h1>
             </div>
             <div className="z-10 w-[550px] h-[550px] bg-white border-[6px] border-black rounded-lg overflow-hidden shadow-2xl">
                 {story.chapters[0].generatedImage && <img src={story.chapters[0].generatedImage} className="w-full h-full object-cover" crossOrigin="anonymous" />}
             </div>
             <div className="z-10 text-center w-full mb-10 bg-white border-4 border-black p-4 rounded-xl transform -rotate-1">
                 <p className="font-comic text-4xl text-black">Autor: {user?.name}</p>
                 {story.isEducational && <p className="font-sans text-xl mt-2 text-gray-600">Material Didático - {story.educationalGoal}</p>}
             </div>
        </div>
        {/* PÁGINAS */}
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

      {generatingPDF && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center text-white">
              <h2 className="font-comic text-4xl mb-4 animate-bounce">Imprimindo Livro ({pdfProgress}%)...</h2>
              <div className="w-64 h-4 bg-gray-700 rounded-full border-2 border-white"><div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{width: `${pdfProgress}%`}}></div></div>
              <p className="mt-4 text-gray-400">Aguarde, estamos preparando as páginas...</p>
          </div>
      )}

      {/* Navegação Superior */}
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

      {/* Conteúdo do Livro */}
      <div className="grid md:grid-cols-12 gap-8">
        <div className="md:col-span-12">
          <Card className="min-h-[500px] flex flex-col bg-white" color="white">
            <div className="w-full h-64 md:h-96 mb-8 rounded-xl border-4 border-black overflow-hidden bg-gray-100 relative shadow-inner">
                {currentChapter.generatedImage ? (
                    <img src={currentChapter.generatedImage} className="w-full h-full object-cover animate-fade-in" crossOrigin="anonymous" />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 flex-col">
                        <span className="text-4xl animate-bounce">🎨</span>
                        <span>Ilustrando...</span>
                    </div>
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
                 
                 {/* BOTÃO PRÓXIMO / FINALIZAR */}
                 <Button 
                    onClick={() => setActiveChapterIndex(p => p + 1)} 
                    variant={activeChapterIndex < story.chapters.length - 1 ? "primary" : "success"}
                    className={activeChapterIndex === story.chapters.length - 1 ? "animate-pulse" : ""}
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
