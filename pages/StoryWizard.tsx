
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Avatar } from '../types';
import { generateStory } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';

const StoryWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatarIds, setSelectedAvatarIds] = useState<string[]>([]);
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    // Carregar Avatares do Supabase
    const loadAvatars = async () => {
        const { data } = await supabase.from('avatars').select('*').eq('user_id', user.id);
        if (data) {
            setAvatars(data.map(d => ({
                id: d.id,
                name: d.name,
                imageUrl: d.image_url,
                description: d.description
            })));
        }
    };
    loadAvatars();
  }, [user]);

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
    if (!theme.trim()) {
        alert("Por favor, digite sobre o que será a história!");
        return;
    }
    if (selectedAvatarIds.length === 0) {
        alert("Selecione pelo menos um personagem!");
        return;
    }
    if (!user) return;

    const check = authService.canCreateStory(user);
    if (!check.allowed) {
        if (confirm(`${check.reason}\n\n✨ Deseja ir para a Loja ver os planos?`)) {
            navigate('/pricing');
        }
        return;
    }

    setLoading(true);
    const selectedChars = avatars.filter(a => selectedAvatarIds.includes(a.id));

    try {
      const storyData = await generateStory(theme, selectedChars);
      
      const storyId = crypto.randomUUID();
      const fullStory = {
        id: storyId,
        createdAt: Date.now(),
        characters: selectedChars,
        theme,
        isPremium: check.type === 'premium',
        isEducational: false,
        ...storyData
      };

      await authService.consumeStoryCredit(user.id, check.type || 'free');
      refreshUser();

      // Salva no Supabase
      const { error } = await supabase.from('stories').insert({
          id: storyId,
          user_id: user.id,
          title: fullStory.title,
          theme: fullStory.theme,
          is_premium: fullStory.isPremium,
          is_educational: false,
          characters: fullStory.characters,
          chapters: fullStory.chapters,
          created_at: fullStory.createdAt
      });

      if (error) throw error;

      // Cache imediato para transição rápida
      localStorage.setItem('currentStory', JSON.stringify(fullStory));
      navigate(`/story/${storyId}`);

    } catch (error) {
      console.error(error);
      alert("Ops! Tivemos um bloqueio criativo. Tente mudar o tema.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Mantendo JSX visual original */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <h1 className="font-heading text-4xl md:text-5xl text-white text-stroke-black drop-shadow-md">
            Montando a Aventura 🗺️
        </h1>
        {user?.plan === 'free' && (
            <div className="bg-white border-2 border-black px-4 py-2 rounded-lg text-sm font-bold shadow-doodle flex flex-col items-end gap-1 transform rotate-1">
                 <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Seus Créditos (Mês)</div>
                 <div className="flex items-center gap-3">
                     <div className="text-right">
                         <span className="block text-xs">🌟 Completa</span>
                         <span className={`text-lg font-comic ${user.monthlyPremiumTrialUsed < 1 ? "text-green-600" : "text-gray-400"}`}>
                             {1 - (user.monthlyPremiumTrialUsed || 0)}/1
                         </span>
                     </div>
                     <div className="w-px h-8 bg-gray-300"></div>
                      <div className="text-right">
                         <span className="block text-xs">📝 Texto</span>
                         <span className={`text-lg font-comic ${user.monthlyFreeUsed < 3 ? "text-blue-600" : "text-gray-400"}`}>
                             {3 - (user.monthlyFreeUsed || 0)}/3
                         </span>
                     </div>
                 </div>
            </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
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
            </Card>
          </div>

          <div className="transform hover:scale-105 transition-transform relative group">
             <Button 
                className="w-full text-2xl py-6 shadow-cartoon-lg" 
                variant="primary"
                disabled={loading || avatars.length === 0}
                onClick={handleGenerate}
                loading={loading}
                pulse={!loading && !!theme && selectedAvatarIds.length > 0}
            >
                {loading ? 'Escrevendo a história... 🪄' : 'CRIAR HISTÓRIA! 🎬'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryWizard;
