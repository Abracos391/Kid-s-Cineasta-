
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Avatar, Story } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

type FilterType = 'all' | 'adventure' | 'educational';

const Library: React.FC = () => {
  const { user } = useAuth();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
        // Avatars
        const { data: avData } = await supabase.from('avatars').select('*').eq('user_id', user.id);
        if (avData) setAvatars(avData.map(d => ({ id: d.id, name: d.name, imageUrl: d.image_url, description: d.description })));

        // Stories
        const { data: stData } = await supabase.from('stories').select('*').eq('user_id', user.id);
        if (stData) setStories(stData.map(d => ({
            id: d.id,
            title: d.title,
            theme: d.theme,
            createdAt: d.created_at,
            isPremium: d.is_premium,
            isEducational: d.is_educational,
            chapters: d.chapters,
            characters: d.characters
        })));
    };
    fetchData();
  }, [user]);

  const deleteAvatar = async (id: string) => {
    if(confirm('Tem certeza que quer deletar este personagem?')) {
      await supabase.from('avatars').delete().eq('id', id);
      setAvatars(prev => prev.filter(a => a.id !== id));
    }
  };

  const deleteStory = async (id: string) => {
    if(confirm('Tem certeza que quer apagar esta história do acervo?')) {
      await supabase.from('stories').delete().eq('id', id);
      setStories(prev => prev.filter(s => s.id !== id));
    }
  };

  const filteredStories = stories.filter(story => {
    if (filter === 'all') return true;
    if (filter === 'educational') return story.isEducational === true;
    if (filter === 'adventure') return !story.isEducational;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      <h1 className="font-heading text-5xl text-center text-cartoon-purple text-stroke-black drop-shadow-md mb-8">
        Minha Biblioteca Mágica 🏰
      </h1>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-comic text-3xl text-black bg-cartoon-yellow px-4 py-1 inline-block border-[3px] border-black rounded-hand rotate-1">
            Meus Personagens ({avatars.length})
          </h2>
          <Link to="/avatars"><Button size="sm" variant="primary">+ Novo</Button></Link>
        </div>
        {avatars.length === 0 ? <p className="text-center text-gray-400">Nenhum personagem.</p> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {avatars.map((avatar) => (
              <div key={avatar.id} className="relative group">
                <Card color="white" className="p-2 text-center h-full">
                  <img src={avatar.imageUrl} alt={avatar.name} className="w-32 h-32 mx-auto rounded-full border-4 border-black object-cover bg-gray-100 mb-2" />
                  <h3 className="font-heading text-xl truncate">{avatar.name}</h3>
                  <button onClick={() => deleteAvatar(avatar.id)} className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full border-2 border-black font-bold opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-col md:flex-row items-end md:items-center justify-between mb-6 gap-4">
          <h2 className="font-comic text-3xl text-black bg-cartoon-blue text-white px-4 py-1 inline-block border-[3px] border-black rounded-hand -rotate-1">
            Minhas Histórias ({stories.length})
          </h2>
        </div>
        
        {filteredStories.length === 0 ? <p className="text-center text-gray-400">Nenhuma história.</p> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredStories.map((story) => (
              <div key={story.id} className="relative group h-full">
                <Card color={story.isEducational ? 'green' : 'orange'} tape title={story.isEducational ? 'ACERVO' : 'LIVRO'} className="h-full flex flex-col justify-between bg-white">
                  <div>
                    <h3 className="font-heading text-2xl mb-2 leading-tight pr-8">{story.title}</h3>
                    <p className="font-sans text-sm mb-4 italic text-gray-600">"{story.theme}"</p>
                  </div>
                  <div className="flex justify-between items-center mt-4 border-t-2 border-black/10 pt-4">
                    <span className="text-xs font-bold text-gray-500">{new Date(story.createdAt).toLocaleDateString()}</span>
                    <Link to={`/story/${story.id}`}><Button size="sm" variant={story.isEducational ? 'primary' : 'success'}>Ler Agora 📖</Button></Link>
                  </div>
                  <button onClick={() => deleteStory(story.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xl bg-white/50 rounded-full w-8 h-8">🗑️</button>
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Library;
