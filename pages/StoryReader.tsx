import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Story } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { generateSpeech, generateChapterIllustration } from '../services/geminiService';
import AudioPlayer from '../components/AudioPlayer';

const StoryReader: React.FC = () => {
  const { id } = useParams();
  const [story, setStory] = useState<Story | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [generatedAudioMap, setGeneratedAudioMap] = useState<Record<number, string>>({});
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [chapterImages, setChapterImages] = useState<Record<number, string>>({});

  useEffect(() => {
    // Tenta encontrar a história na biblioteca (savedStories)
    const allStories: Story[] = JSON.parse(localStorage.getItem('savedStories') || '[]');
    const found = allStories.find(s => s.id === id);
    
    if (found) {
      setStory(found);
    } else {
      // Fallback para "currentStory" se tiver acabado de criar
      const current = localStorage.getItem('currentStory');
      if (current) {
        const parsed = JSON.parse(current);
        if (parsed.id === id) setStory(parsed);
      }
    }
  }, [id]);

  useEffect(() => {
    if (story && !chapterImages[activeChapterIndex]) {
      const chapter = story.chapters[activeChapterIndex];
      const imageUrl = generateChapterIllustration(chapter.visualDescription);
      setChapterImages(prev => ({
        ...prev,
        [activeChapterIndex]: imageUrl
      }));
    }
  }, [activeChapterIndex, story, chapterImages]);

  if (!story) return (
    <div className="min-h-[60vh] flex items-center justify-center flex-col gap-4">
        <div className="animate-spin text-6xl">⏳</div>
        <div className="font-heading text-3xl text-white text-stroke-black">Procurando o livro na estante...</div>
    </div>
  );

  const currentChapter = story.chapters[activeChapterIndex];

  const handleGenerateAudio = async () => {
    if (generatedAudioMap[activeChapterIndex]) return;
    
    setGeneratingAudio(true);
    try {
      const audioBase64 = await generateSpeech(currentChapter.text);
      setGeneratedAudioMap(prev => ({
        ...prev,
        [activeChapterIndex]: audioBase64
      }));
    } catch (error) {
      alert("Ops! O narrador teve um problema técnico.");
    } finally {
      setGeneratingAudio(false);
    }
  };

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
        <Link to="/library">
          <Button size="sm" variant="danger" className="whitespace-nowrap">❌ Fechar Livro</Button>
        </Link>
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
                {chapterImages[activeChapterIndex] ? (
                    <img 
                        src={chapterImages[activeChapterIndex]} 
                        alt="Ilustração da cena" 
                        className="w-full h-full object-cover animate-fade-in"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="animate-spin text-4xl">🎨</span>
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
              <div className="bg-cartoon-cream px-4 py-2 rounded-xl border-2 border-black w-full md:w-auto flex justify-center">
                {generatedAudioMap[activeChapterIndex] ? (
                    <AudioPlayer base64Audio={generatedAudioMap[activeChapterIndex]} />
                ) : (
                    <Button 
                    onClick={handleGenerateAudio} 
                    disabled={generatingAudio} 
                    variant="secondary" 
                    size="sm"
                    loading={generatingAudio}
                    className="w-full md:w-auto"
                    >
                    🔊 Ouvir Narrador (Premium)
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