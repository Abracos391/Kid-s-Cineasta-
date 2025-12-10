
import React, { useEffect, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
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
      alert("Erro ao gerar áudio. Tente novamente.");
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
  const currentChapter = story.chapters[activeChapterIndex] || story.chapters[story.chapters.length-1];

  return (
    <div className={`max-w-5xl mx-auto px-4 pb-20 ${story.isEducational ? 'font-sans' : ''}`}>
      
      {isFinished ? (
          <div className="min-h-[80vh] flex items-center justify-center flex-col gap-6 p-4 relative z-50">
               <Card color={story.isEducational ? 'green' : 'yellow'} className="text-center p-8 md:p-12 max-w-2xl w-full border-[6px] shadow-2xl animate-fade-in">
                   <h1 className="font-heading text-4xl md:text-5xl mb-4">Fim da Aventura!</h1>
                   <div className="flex flex-col gap-4 justify-center">
                       <Button variant="primary" onClick={() => setActiveChapterIndex(0)}>📖 Ler Novamente</Button>
                       <Button variant="secondary" onClick={handleExit} size="sm" className="mt-4 border-dashed">🚪 Salvar e Sair</Button>
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
