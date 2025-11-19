import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Story, StoryChapter } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { generateSpeech } from '../services/geminiService';
import AudioPlayer from '../components/AudioPlayer';

const StoryReader: React.FC = () => {
  const { id } = useParams();
  const [story, setStory] = useState<Story | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [generatedAudioMap, setGeneratedAudioMap] = useState<Record<number, string>>({});
  const [generatingAudio, setGeneratingAudio] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('currentStory');
    if (saved) {
      const parsed = JSON.parse(saved);
      setStory(parsed);
    }
  }, [id]);

  if (!story) return (
    <div className="min-h-[60vh] flex items-center justify-center flex-col gap-4">
        <div className="animate-spin text-6xl">⏳</div>
        <div className="font-heading text-3xl text-white text-stroke-black">Abrindo o livro...</div>
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
      alert("Ops! O narrador está bebendo água. Tente já já.");
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
            <span>📖 Capítulo {activeChapterIndex + 1}</span>
            <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">de {story.chapters.length}</span>
          </div>
        </div>
        <Link to="/create-story">
          <Button size="sm" variant="danger" className="whitespace-nowrap">❌ Sair</Button>
        </Link>
      </div>

      {/* Progress Bar Fun */}
      <div className="w-full bg-white rounded-full h-6 mb-8 border-4 border-black overflow-hidden relative shadow-sm">
        <div 
          className="bg-gradient-to-r from-cartoon-yellow to-cartoon-orange h-full transition-all duration-500 ease-out relative" 
          style={{ width: `${progress}%` }}
        >
            {/* Shine effect on bar */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white opacity-30"></div>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        
        {/* Characters Side Panel */}
        <div className="hidden md:block md:col-span-3 space-y-6">
            <div className="bg-cartoon-blue p-4 rounded-3xl border-4 border-black shadow-cartoon rotate-1">
                <h3 className="font-heading font-bold text-xl text-center text-white mb-4 uppercase tracking-widest text-stroke-black">Atores</h3>
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
          <Card className="min-h-[500px] flex flex-col justify-between bg-white" color="white">
            
            {/* Page Decor Lines */}
            <div className="absolute top-0 left-8 bottom-0 w-0.5 bg-red-200 hidden md:block"></div>
            <div className="absolute top-0 left-9 bottom-0 w-0.5 bg-red-200 hidden md:block"></div>

            <div className="md:pl-12 relative z-10">
              <h2 className="font-heading text-3xl mb-6 text-black underline decoration-cartoon-yellow decoration-4 underline-offset-4">{currentChapter.title}</h2>
              
              <div className="font-sans text-xl md:text-2xl text-gray-800 leading-loose mb-8">
                {currentChapter.text.split('\n').map((p, i) => (
                  <p key={i} className="mb-6">{p}</p>
                ))}
              </div>
            </div>

            {/* Interactive Footer */}
            <div className="border-t-4 border-gray-100 border-dashed pt-6 flex flex-col md:flex-row items-center justify-between gap-6 md:pl-12">
              
              {/* Audio Player Container */}
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
                    🔊 Ouvir História
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
                  ⬅️
                </Button>

                {activeChapterIndex === story.chapters.length - 1 ? (
                  <Link to="/">
                    <Button variant="success" pulse>RECOMEÇAR! 🎉</Button>
                  </Link>
                ) : (
                  <Button onClick={nextChapter} variant="primary">
                    Próxima Página ➡️
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