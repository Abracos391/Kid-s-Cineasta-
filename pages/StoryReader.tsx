
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
  
  // Ref para o container de "impressão" (o livro completo invisível)
  const bookPrintRef = useRef<HTMLDivElement>(null);
  
  const [story, setStory] = useState<Story | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0); // 0 a 100
  const [loadError, setLoadError] = useState(false);

  // Função para atualizar a história no armazenamento (Persistência)
  const updateStoryInStorage = (updatedStory: Story) => {
    setStory(updatedStory);
    
    // Critério de salvamento: Ser Premium OU Ser Educacional
    const shouldSave = user?.plan === 'premium' || updatedStory.isEducational;

    if (shouldSave) {
        const savedStories: Story[] = JSON.parse(localStorage.getItem('savedStories') || '[]');
        const index = savedStories.findIndex(s => s.id === updatedStory.id);
        
        if (index !== -1) {
            // Atualiza existente
            savedStories[index] = updatedStory;
            localStorage.setItem('savedStories', JSON.stringify(savedStories));
        } else {
            // Caso raro onde não estava salvo ainda (mas deveria)
            savedStories.unshift(updatedStory);
            localStorage.setItem('savedStories', JSON.stringify(savedStories));
        }
    }
    
    // Atualiza também no currentStory (cache imediato)
    localStorage.setItem('currentStory', JSON.stringify(updatedStory));
  };

  useEffect(() => {
    if (!id) return;

    // 1. Tenta carregar da biblioteca permanente
    const allStories: Story[] = JSON.parse(localStorage.getItem('savedStories') || '[]');
    // Comparação frouxa (==) para garantir que string '123' encontre number 123 se houver discrepância
    let found = allStories.find(s => String(s.id) === String(id));
    
    // 2. Se não achar, tenta carregar do cache temporário
    if (!found) {
      const current = localStorage.getItem('currentStory');
      if (current) {
        const parsed = JSON.parse(current);
        if (String(parsed.id) === String(id)) found = parsed;
      }
    }
    
    if (found) {
        setStory(found);
        setLoadError(false);
    } else {
        setLoadError(true);
    }
  }, [id]);

  useEffect(() => {
    // Gerar imagem automaticamente se não existir e se a história estiver carregada
    if (story && story.chapters && story.chapters[activeChapterIndex]) {
      const chapter = story.chapters[activeChapterIndex];
      
      if (!chapter.generatedImage) {
        // Cria descrição combinada dos personagens se a visualDescription não for suficiente
        const charsDesc = story.characters ? story.characters.map(c => `${c.name} (${c.description})`).join(', ') : '';
        
        const imageUrl = generateChapterIllustration(chapter.visualDescription, charsDesc);
        
        // Atualiza o objeto da história com a nova imagem para não gerar de novo
        const updatedChapters = [...story.chapters];
        updatedChapters[activeChapterIndex] = { ...chapter, generatedImage: imageUrl };
        
        updateStoryInStorage({ ...story, chapters: updatedChapters });
      }
    }
  }, [activeChapterIndex, story]);

  if (loadError) return (
      <div className="min-h-[60vh] flex items-center justify-center flex-col gap-6 text-center">
          <div className="text-8xl">🕵️‍♀️</div>
          <h1 className="font-heading text-4xl text-white text-stroke-black">História não encontrada!</h1>
          <p className="font-bold text-gray-700 bg-white p-4 rounded-xl border-2 border-black">
              Parece que essa história sumiu da estante ou não foi salva corretamente.
          </p>
          <Button variant="primary" onClick={() => navigate('/')}>Voltar para o Início</Button>
      </div>
  );

  if (!story) return (
    <div className="min-h-[60vh] flex items-center justify-center flex-col gap-4">
        <div className="animate-spin text-6xl">⏳</div>
        <div className="font-heading text-3xl text-white text-stroke-black">Abrindo o livro...</div>
    </div>
  );

  const currentChapter = story.chapters ? story.chapters[activeChapterIndex] : null;

  if (!currentChapter) return (
      <div className="min-h-[60vh] flex items-center justify-center">
          <p className="bg-white p-4 rounded border-2 border-black font-bold text-red-500">
              Erro: O capítulo {activeChapterIndex + 1} não existe nesta história.
          </p>
      </div>
  );

  const handleGenerateAudio = async () => {
    const isPremiumStory = story.isPremium === true || user?.plan === 'premium' || story.isEducational === true;

    if (!isPremiumStory && user?.plan === 'free') {
        if(confirm("🔒 A narração com voz é exclusiva para histórias Premium.\n\nDeseja conhecer os planos e liberar esse recurso?")) {
            navigate('/pricing');
        }
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
      alert("Ops! O narrador teve um problema técnico.");
    } finally {
      setGeneratingAudio(false);
    }
  };
  
  const handleFullBookDownload = async () => {
      const isPremiumStory = story.isPremium === true || user?.plan === 'premium' || story.isEducational === true;

      if (!isPremiumStory && user?.plan === 'free') {
        if(confirm("🔒 O download do Livro Completo em PDF é exclusivo para Histórias Premium.\n\nDeseja fazer o upgrade para colecionar suas histórias?")) {
            navigate('/pricing');
        }
        return;
      }

      setGeneratingPDF(true);
      setPdfProgress(10);

      await new Promise(r => setTimeout(r, 1000));

      try {
        const bookContainer = bookPrintRef.current;
        if (!bookContainer) throw new Error("Layout do livro não encontrado");

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pages = bookContainer.querySelectorAll('.book-page');
        
        for (let i = 0; i < pages.length; i++) {
            setPdfProgress(10 + Math.floor(((i + 1) / pages.length) * 80));
            const pageEl = pages[i] as HTMLElement;

            const canvas = await html2canvas(pageEl, {
                scale: 2, 
                useCORS: true, 
                logging: false,
                backgroundColor: null,
                allowTaint: true
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }

        setPdfProgress(100);
        pdf.save(`${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_completo.pdf`);

      } catch (error) {
          console.error(error);
          alert("Erro ao criar o livro. Tente novamente em alguns segundos.");
      } finally {
          setGeneratingPDF(false);
          setPdfProgress(0);
      }
  }

  const nextChapter = () => {
    if (activeChapterIndex < story.chapters.length - 1) {
      setActiveChapterIndex(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevChapter = () => {
    if (activeChapterIndex > 0) {
      setActiveChapterIndex(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };
  
  const handleExit = () => {
    if (story.isEducational) {
        navigate('/school-library');
    } else {
        navigate('/library');
    }
  }

  const progress = ((activeChapterIndex + 1) / story.chapters.length) * 100;

  return (
    <div className={`max-w-5xl mx-auto px-4 pb-20 ${story.isEducational ? 'font-sans' : ''}`}>
      
      {/* 
          === LAYOUT DE IMPRESSÃO (A4) === 
      */}
      <div 
        ref={bookPrintRef} 
        style={{ 
            position: 'fixed', 
            top: 0, 
            left: generatingPDF ? '0' : '-10000px',
            zIndex: -10,
            width: '794px' 
        }}
      >
        {/* CAPA */}
        {story.isEducational ? (
            // === CAPA ESCOLAR (VERDE) ===
            <div className="book-page relative w-[794px] h-[1123px] bg-[#1a3c28] overflow-hidden border-8 border-[#8B4513] flex flex-col items-center justify-between p-12">
                <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" style={{backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2.5px)', backgroundSize: '40px 40px'}}></div>
                
                <div className="z-10 w-full border-b-2 border-white/30 pb-4 mb-4">
                    <div className="flex justify-between items-center text-white/80 font-comic text-xl">
                        <span>ESCOLA CINEASTA KIDS</span>
                        <span>DATA: {new Date(story.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="z-10 text-center w-full mt-4">
                    <h1 className="font-hand text-7xl text-white tracking-wide leading-tight mb-4" style={{ fontFamily: '"Comic Neue", cursive' }}>
                        {story.title}
                    </h1>
                    <div className="inline-block bg-yellow-600 text-black font-bold px-4 py-1 rounded transform -rotate-2 shadow-lg">
                        MATERIAL DIDÁTICO
                    </div>
                    {story.educationalGoal && (
                        <div className="mt-4 text-white/70 text-sm border border-white/30 p-2 rounded max-w-lg mx-auto">
                            Obj. BNCC: {story.educationalGoal}
                        </div>
                    )}
                </div>

                <div className="z-10 w-[500px] h-[400px] bg-white border-[10px] border-white rounded-lg shadow-2xl rotate-1 transform hover:rotate-0 transition-transform overflow-hidden">
                     {story.chapters[0].generatedImage ? (
                         <img src={story.chapters[0].generatedImage} className="w-full h-full object-cover" crossOrigin="anonymous" />
                     ) : (
                         <div className="w-full h-full bg-gray-200 flex items-center justify-center">📷</div>
                     )}
                </div>

                <div className="z-10 text-center w-full mb-10 text-white">
                    <p className="font-heading text-2xl mb-2 text-yellow-400">Professor(a): {story.characters[0].name}</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                        {story.characters.slice(1).map(c => (
                            <span key={c.id} className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold border border-white/30">
                                {c.name}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        ) : (
            // === CAPA PADRÃO ===
            <div className="book-page relative w-[794px] h-[1123px] bg-cartoon-yellow overflow-hidden border-8 border-black flex flex-col items-center justify-between p-12">
                <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{backgroundImage: 'radial-gradient(circle, #000 2px, transparent 2.5px)', backgroundSize: '30px 30px'}}></div>
                
                <div className="z-10 text-center w-full mt-10">
                    <h1 className="font-comic text-7xl text-cartoon-blue text-stroke-3 drop-shadow-lg leading-tight mb-4">
                        {story.title}
                    </h1>
                    <p className="font-heading text-3xl text-black">Uma aventura original</p>
                </div>

                <div className="z-10 w-[550px] h-[550px] bg-white border-[6px] border-black rounded-full overflow-hidden shadow-2xl rotate-2">
                     {story.chapters[0].generatedImage ? (
                         <img src={story.chapters[0].generatedImage} className="w-full h-full object-cover" crossOrigin="anonymous" />
                     ) : (
                         <div className="w-full h-full bg-cartoon-cream flex items-center justify-center text-6xl">🎨</div>
                     )}
                </div>

                <div className="z-10 text-center w-full mb-10">
                    <div className="bg-white border-4 border-black rounded-xl p-4 inline-block transform -rotate-1 shadow-doodle">
                        <p className="font-sans font-bold text-2xl text-gray-500 uppercase tracking-widest text-xs mb-1">Escrito por</p>
                        <p className="font-comic text-4xl text-cartoon-pink text-stroke-black">{user?.name || "Autor Misterioso"}</p>
                    </div>
                    <p className="mt-6 font-bold text-lg opacity-60">Cineasta Kids • Edição Limitada</p>
                </div>
            </div>
        )}

        {/* PÁGINAS DOS CAPÍTULOS */}
        {story.chapters.map((chapter, idx) => (
            <div key={idx} className="book-page w-[794px] h-[1123px] bg-white border-8 border-black relative flex flex-col overflow-hidden">
                <div className={`h-4 w-full border-b-4 border-black ${story.isEducational ? 'bg-green-600' : 'bg-cartoon-blue'}`}></div>
                <div className={`h-4 w-full border-b-4 border-black ${story.isEducational ? 'bg-yellow-500' : 'bg-cartoon-pink'}`}></div>

                <div className="h-[550px] w-full bg-gray-100 border-b-8 border-black relative overflow-hidden flex items-center justify-center group">
                    {chapter.generatedImage ? (
                        <img 
                            src={chapter.generatedImage} 
                            className="w-full h-full object-cover" 
                            crossOrigin="anonymous" 
                            style={{ objectPosition: 'center' }}
                        />
                    ) : (
                        <span className="text-4xl text-gray-400">Imagem não gerada</span>
                    )}
                    <div className={`absolute bottom-6 right-6 w-16 h-16 rounded-full border-4 border-black flex items-center justify-center font-comic text-3xl shadow-doodle z-10 ${story.isEducational ? 'bg-green-200' : 'bg-cartoon-yellow'}`}>
                        {idx + 1}
                    </div>
                </div>

                <div className="flex-grow p-12 flex flex-col justify-center bg-cartoon-cream relative">
                    <div className="absolute top-4 left-4 text-6xl opacity-10 rotate-12">{story.isEducational ? '🎓' : '✨'}</div>
                    <div className="absolute bottom-4 right-4 text-6xl opacity-10 -rotate-12">{story.isEducational ? '📚' : '🌟'}</div>

                    <h2 className="font-heading text-4xl mb-8 text-cartoon-purple text-center underline decoration-wavy decoration-cartoon-orange">{chapter.title}</h2>
                    
                    <div className="bg-white border-4 border-black p-8 rounded-2xl shadow-sm transform rotate-1">
                        <p className="font-sans text-3xl leading-relaxed text-gray-800 text-justify font-medium">
                            {chapter.text}
                        </p>
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* Overlay de Loading do PDF */}
      {generatingPDF && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center text-white">
              <div className="text-8xl animate-bounce mb-8">🖨️</div>
              <h2 className="font-comic text-5xl text-cartoon-yellow text-stroke-black mb-4">Imprimindo seu Livro...</h2>
              <p className="text-2xl font-bold mb-8">Isso pode levar alguns segundos!</p>
              
              <div className="w-[300px] h-8 bg-gray-700 rounded-full border-2 border-white overflow-hidden">
                  <div className="h-full bg-cartoon-green transition-all duration-300" style={{ width: `${pdfProgress}%` }}></div>
              </div>
              <p className="mt-2 font-mono">{pdfProgress}%</p>
          </div>
      )}

      {/* --- UI PRINCIPAL --- */}
      
      {/* Header */}
      <div className="mb-8 bg-white rounded-2xl border-4 border-black p-4 shadow-cartoon flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
            <div className="flex items-center gap-2">
                <h1 className="font-heading text-3xl md:text-4xl text-cartoon-purple drop-shadow-sm">{story.title}</h1>
                {story.isEducational && <span className="bg-green-100 text-green-800 border border-green-600 text-xs px-2 py-1 rounded font-bold">AULA</span>}
            </div>
          <div className="flex items-center gap-2 font-bold text-gray-500">
            <span>📖 Página {activeChapterIndex + 1}</span>
            <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">de {story.chapters.length}</span>
          </div>
        </div>
        <div className="flex gap-2">
            <Button 
                size="sm" 
                variant="primary" 
                onClick={handleFullBookDownload} 
                disabled={generatingPDF}
                className="flex items-center gap-1 shadow-lg hover:shadow-xl hover:scale-105"
            >
                {generatingPDF ? 'Processando...' : '📚 Baixar Livro Completo'} 
                {(!story.isPremium && user?.plan === 'free' && !story.isEducational) && '🔒'}
            </Button>
             <Button size="sm" variant="danger" onClick={handleExit} className="whitespace-nowrap">❌ Sair</Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white rounded-full h-6 mb-8 border-4 border-black overflow-hidden relative shadow-sm">
        <div 
          className={`h-full transition-all duration-500 ease-out relative ${story.isEducational ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-cartoon-yellow to-cartoon-orange'}`}
          style={{ width: `${progress}%` }}
        >
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white opacity-30"></div>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        
        {/* Characters Side Panel */}
        <div className="hidden md:block md:col-span-3 space-y-6">
            <div className={`p-4 rounded-3xl border-4 border-black shadow-cartoon rotate-1 ${story.isEducational ? 'bg-green-700' : 'bg-cartoon-blue'}`}>
                <h3 className="font-heading font-bold text-xl text-center text-white mb-4 uppercase tracking-widest text-stroke-black">
                    {story.isEducational ? 'Chamada' : 'Elenco'}
                </h3>
                <div className="space-y-4">
                {story.characters.map(char => (
                    <div key={char.id} className="relative transform transition-transform hover:scale-105">
                    <img 
                        src={char.imageUrl} 
                        alt={char.name} 
                        className="w-20 h-20 mx-auto object-cover rounded-full border-4 border-black bg-white"
                    />
                    <div className="text-center mt-1 font-heading font-bold bg-white border-2 border-black rounded-lg mx-auto w-max px-2 text-sm shadow-sm">
                        {char.name}
                    </div>
                    </div>
                ))}
                </div>
            </div>
        </div>

        {/* Main Story Content */}
        <div className="md:col-span-9" >
          <Card className="min-h-[500px] flex flex-col bg-white" color="white">
            <div className="bg-white p-2"> 
                {/* Ilustração do Capítulo */}
                <div className="w-full h-64 md:h-80 mb-8 rounded-xl border-4 border-black overflow-hidden bg-gray-100 shadow-inner relative">
                    {currentChapter.generatedImage ? (
                        <img 
                            src={currentChapter.generatedImage} 
                            alt="Ilustração da cena" 
                            className="w-full h-full object-cover animate-fade-in"
                            crossOrigin="anonymous" 
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <div className="text-center">
                                <span className="animate-spin text-4xl block mb-2">🎨</span>
                                <span className="font-comic text-gray-500">Pintando a cena...</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative z-10 flex-grow">
                <h2 className="font-heading text-3xl mb-6 text-black underline decoration-cartoon-yellow decoration-4 underline-offset-4">{currentChapter.title}</h2>
                
                <div className="font-sans text-xl md:text-2xl text-gray-800 leading-loose mb-8">
                    {currentChapter.text.split('\n').map((p, i) => (
                    <p key={i} className="mb-6">{p}</p>
                    ))}
                </div>
                </div>
            </div>

            {/* Interactive Footer */}
            <div className="border-t-4 border-gray-100 border-dashed pt-6 flex flex-col md:flex-row items-center justify-between gap-6">
              
              {/* Audio Player */}
              <div className="bg-cartoon-cream px-4 py-2 rounded-xl border-2 border-black w-full md:w-auto flex justify-center relative">
                
                {currentChapter.generatedAudio ? (
                    <AudioPlayer base64Audio={currentChapter.generatedAudio} />
                ) : (
                    <Button 
                    onClick={handleGenerateAudio} 
                    disabled={generatingAudio} 
                    variant="secondary" 
                    size="sm"
                    loading={generatingAudio}
                    className="w-full md:w-auto"
                    >
                    🔊 Ouvir Narrador
                    </Button>
                )}
              </div>

              {/* Navigation */}
              <div className="flex gap-4 w-full md:w-auto justify-between">
                <Button 
                  onClick={prevChapter} 
                  disabled={activeChapterIndex === 0}
                  variant="secondary"
                  size="sm"
                >
                  ⬅️ Anterior
                </Button>

                {activeChapterIndex === story.chapters.length - 1 ? (
                  <Button onClick={handleExit} variant="success" pulse>FIM! 🎉</Button>
                ) : (
                  <Button onClick={nextChapter} variant="primary">
                    Próxima ➡️
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StoryReader;
