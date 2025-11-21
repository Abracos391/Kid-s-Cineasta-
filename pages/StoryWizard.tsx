import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Avatar } from '../types';
import { generateStory } from '../services/geminiService';

const StoryWizard: React.FC = () => {
  const navigate = useNavigate();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatarIds, setSelectedAvatarIds] = useState<string[]>([]);
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('avatars');
    if (saved) {
      setAvatars(JSON.parse(saved));
    }
  }, []);

  const toggleAvatar = (id: string) => {
    if (selectedAvatarIds.includes(id)) {
      setSelectedAvatarIds(prev => prev.filter(aid => aid !== id));
    } else {
      if (selectedAvatarIds.length >= 3) {
        alert("Ei! Escolha no máximo 3 amigos para a aventura!");
        return;
      }
      setSelectedAvatarIds(prev => [...prev, id]);
    }
  };

  const handleGenerate = async () => {
    if (!theme || selectedAvatarIds.length === 0) return;

    setLoading(true);
    const selectedChars = avatars.filter(a => selectedAvatarIds.includes(a.id));

    try {
      const storyData = await generateStory(theme, selectedChars);
      
      const fullStory = {
        id: Date.now().toString(),
        createdAt: Date.now(),
        characters: selectedChars,
        theme,
        ...storyData
      };

      // Salvar na lista permanente (Biblioteca)
      const existingStories = JSON.parse(localStorage.getItem('savedStories') || '[]');
      localStorage.setItem('savedStories', JSON.stringify([fullStory, ...existingStories]));
      
      // Salvar como atual também para leitura imediata rápida (cache)
      localStorage.setItem('currentStory', JSON.stringify(fullStory));

      navigate(`/story/${fullStory.id}`);
    } catch (error) {
      console.error(error);
      alert("Ops! Tivemos um bloqueio criativo. Tente mudar o tema ou tente novamente!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-heading text-5xl text-center mb-10 text-white text-stroke-black drop-shadow-md">
        Montando a Aventura 🗺️
      </h1>

      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
        
        {/* Step 1: Choose Characters */}
        <div className="transform -rotate-1">
            <Card title="1. Quem vai participar?" color="green">
            {avatars.length === 0 ? (
                <div className="text-center py-12 bg-white/50 rounded-2xl border-2 border-black border-dashed">
                <p className="mb-6 font-heading text-xl">Opa! O elenco está vazio.</p>
                <Button onClick={() => navigate('/avatars')} variant="secondary">Criar Personagem</Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                {avatars.map(avatar => {
                    const isSelected = selectedAvatarIds.includes(avatar.id);
                    return (
                        <div 
                        key={avatar.id}
                        onClick={() => toggleAvatar(avatar.id)}
                        className={`cursor-pointer rounded-2xl border-4 transition-all transform duration-200 overflow-hidden bg-white ${
                            isSelected 
                            ? 'border-cartoon-pink scale-105 shadow-cartoon rotate-2 z-10' 
                            : 'border-black hover:scale-105 hover:border-gray-600 opacity-80 hover:opacity-100'
                        }`}
                        >
                        <img src={avatar.imageUrl} alt={avatar.name} className="w-full h-32 object-cover border-b-4 border-black" />
                        <div className={`p-2 font-bold text-center font-heading text-sm truncate ${isSelected ? 'bg-cartoon-pink text-white' : ''}`}>
                            {isSelected ? '✅ ' : ''}{avatar.name}
                        </div>
                        </div>
                    );
                })}
                </div>
            )}
            <p className="mt-4 font-bold text-right text-lg">{selectedAvatarIds.length}/3 escolhidos</p>
            </Card>
        </div>

        {/* Step 2: Theme */}
        <div className="space-y-8">
          <div className="transform rotate-1">
            <Card title="2. O que vai acontecer?" color="orange">
                <div className="bg-white p-2 rounded-2xl border-4 border-black">
                    <textarea
                    className="w-full h-40 p-4 rounded-xl outline-none resize-none font-sans text-xl bg-cartoon-cream"
                    placeholder="Ex: Eles encontraram uma nave espacial no quintal e viajaram para o planeta dos doces..."
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                    <span className="font-bold text-sm shrink-0 self-center">Ideias:</span>
                    {['Viagem no tempo', 'Festa surpresa', 'Dragão perdido'].map(t => (
                        <button 
                            key={t} 
                            onClick={() => setTheme(t)}
                            className="bg-white border-2 border-black rounded-lg px-3 py-1 text-xs font-bold hover:bg-cartoon-yellow whitespace-nowrap"
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </Card>
          </div>

          <div className="transform hover:scale-105 transition-transform">
             <Button 
                className="w-full text-2xl py-6 shadow-cartoon-lg" 
                variant="primary"
                disabled={loading || !theme || selectedAvatarIds.length === 0}
                onClick={handleGenerate}
                loading={loading}
                pulse={!loading && !!theme && selectedAvatarIds.length > 0}
            >
                {loading ? 'Escrevendo o roteiro...' : 'CRIAR HISTÓRIA! 🎬'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryWizard;