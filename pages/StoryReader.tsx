
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Story } from '../types';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { generateSpeech, generateChapterIllustration } from '../services/geminiService';
import AudioPlayer from '../components/AudioPlayer';

const StoryReader: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [story, setStory] = useState<Story | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [generatingAudio, setGeneratingAudio] = useState(false);

  // Função para atualizar a história no armazenamento (Persistência)
  const updateStoryInStorage = (updatedStory: Story) => {
    setStory(updatedStory);
    
    // Se for premium, atualiza na lista savedStories
    if (user?.plan === 'premium') {
        const savedStories: Story[] = JSON.parse(localStorage.getItem('savedStories') || '[]');
        const index = savedStories.findIndex(s => s.id === updatedStory.id);
        if (index !== -1) {
            savedStories[index] = updatedStory;
            localStorage.setItem('savedStories', JSON.stringify(savedStories));
        }
    }
    
    // Atualiza também no currentStory (cache imediato)
    localStorage.setItem('currentStory', JSON.stringify(updatedStory));
  };

  useEffect(() => {
    // 1. Tenta carregar da biblioteca permanente
    const allStories: Story[] = JSON.parse(localStorage.getItem('savedStories') || '[]');
    let found = allStories.find(s => s.id === id);
    
    // 2. Se não achar, tenta carregar do cache temporário
    if (!found) {
      const current = localStorage.getItem('currentStory');
      if (current) {
        const parsed = JSON.parse(current);
        if (parsed.id === id) found = parsed;
      }
    }
    
    if (found) setStory(found);
  }, [id]);

  useEffect(() => {
    // Gerar imagem automaticamente se não existir
    if (story) {
      const chapter = story.chapters[activeChapterIndex];
      
      if (!chapter.generatedImage) {
        // Cria descrição combinada dos personagens
        const charsDesc = story.characters.map(c => `${c.name} (${c.description})`).join(', ');
        
        const imageUrl = generateChapterIllustration(chapter.visualDescription, charsDesc);
        
        // Atualiza o objeto da história com a nova imagem para não gerar de novo
        const updatedChapters = [...story.chapters];
        updatedChapters[activeChapterIndex] = { ...chapter, generatedImage: imageUrl };
        
        updateStoryInStorage({ ...story, chapters: updatedChapters });
      }
    }
  }, [activeChapterIndex, story]);

  if (!story) return (
    <div className="min-h-[60vh] flex items-center justify-center flex-col gap-4">
        <div className="animate-spin text-6xl">⏳</div>
        <div className="font-heading text-3xl text-white text-stroke-black">Procurando o livro...</div>
    </div>
  );

  const currentChapter = story.chapters[activeChapterIndex];

  const handleGenerateAudio = async () => {
    if (user?.plan !== 'premium') {
        if(confirm("🔒 A narração com voz é exclusiva para membros Premium.\n\nDeseja conhecer os planos e liberar esse recurso?")) {
            navigate('/pricing');
        }
        return;
    }

    // Se já existe áudio salvo, não faz nada (o componente AudioPlayer já vai ter recebido)
    if (currentChapter.generatedAudio) return;
    
    setGeneratingAudio(true);
    try {
      const audioBase64 = await generateSpeech(currentChapter.text);
      
      // Salva o áudio na história
      const updatedChapters = [...story.chapters];
      updatedChapters[activeChapterIndex] = { ...currentChapter, generatedAudio: audioBase64 };
      
      updateStoryInStorage({ ...story, chapters: updatedChapters });

    } catch (error) {
      alert("Ops! O narrador teve um problema técnico.");
    } finally {
      setGeneratingAudio(false);
    }
  };
  
  const handlePDFDownload = () => {
      if (user?.plan !== 'premium') {
        if(confirm("🔒 O download em PDF é exclusivo para membros Premium.\n\nDeseja fazer o upgrade?")) {
            navigate('/pricing');
        }
      } else {
          alert("O gerador de PDF está sendo calibrado pelos duendes! (Em breve)");
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

  const progress = ((activeChapterIndex + 1) / story.chapters.length) * 100;

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      
      {/* Book Header */}
      <div className="mb-8 bg-white rounded-2xl border-4 border-black p-4 shadow-cartoon flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl text-cartoon-purple drop-shadow-sm">{story.title}</h1>
          <div className="flex items-center gap-2 font-bold text-gray-500">
            <span>📖 Página {activeChapterIndex + 1}</span>
            <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">de {story.chapters.length}</span>
          </div>
        </div>
        <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handlePDFDownload} title="Download PDF" className="flex items-center gap-1">
                📄 PDF {user?.plan === 'free' && '🔒'}
            </Button>
            <Link to="/library">
             <Button size="sm" variant="danger" className="whitespace-nowrap">❌ Fechar</Button>
            </Link>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white rounded-full h-6 mb-8 border-4 border-black overflow-hidden relative shadow-sm">
        <div 
          className="bg-gradient-to-r from-cartoon-yellow to-cartoon-orange h-full transition-all duration-500 ease-out relative" 
          style={{ width: `${progress}%` }}
        >
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white opacity-30"></div>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        
        {/* Characters Side Panel */}
        <div className="hidden md:block md:col-span-3 space-y-6">
            <div className="bg-cartoon-blue p-4 rounded-3xl border-4 border-black shadow-cartoon rotate-1">
                <h3 className="font-heading font-bold text-xl text-center text-white mb-4 uppercase tracking-widest text-stroke-black">Elenco</h3>
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
        <div className="md:col-span-9">
          <Card className="min-h-[500px] flex flex-col bg-white" color="white">
            
            {/* Ilustração do Capítulo */}
            <div className="w-full h-64 md:h-80 mb-8 rounded-xl border-4 border-black overflow-hidden bg-gray-100 shadow-inner relative">
                {currentChapter.generatedImage ? (
                    <img 
                        src={currentChapter.generatedImage} 
                        alt="Ilustração da cena" 
                        className="w-full h-full object-cover animate-fade-in"
                        loading="lazy"
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

            {/* Interactive Footer */}
            <div className="border-t-4 border-gray-100 border-dashed pt-6 flex flex-col md:flex-row items-center justify-between gap-6">
              
              {/* Audio Player */}
              <div className="bg-cartoon-cream px-4 py-2 rounded-xl border-2 border-black w-full md:w-auto flex justify-center relative">
                {user?.plan === 'free' && (
                     <div className="absolute -top-3 -right-3 text-2xl z-20">🔒</div>
                )}
                
                {currentChapter.generatedAudio ? (
                    <AudioPlayer base64Audio={currentChapter.generatedAudio} />
                ) : (
                    <Button 
                    onClick={handleGenerateAudio} 
                    disabled={generatingAudio} 
                    variant={user?.plan === 'free' ? 'secondary' : 'secondary'} 
                    size="sm"
                    loading={generatingAudio}
                    className={`w-full md:w-auto ${user?.plan === 'free' ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                    {user?.plan === 'free' ? '🔊 Narrador (Premium)' : '🔊 Ouvir Narrador'}
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
                  <Link to="/library">
                    <Button variant="success" pulse>FIM! 🎉</Button>
                  </Link>
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
