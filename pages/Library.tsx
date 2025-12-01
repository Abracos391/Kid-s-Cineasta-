
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Avatar, Story } from '../types';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';

type FilterType = 'all' | 'adventure' | 'educational';

const Library: React.FC = () => {
  const { user } = useAuth();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
      if (!user) return;
      // setLoading(true); // Omitido para evitar piscar na tela ao focar
      try {
          console.log("Atualizando biblioteca...");
          const [userAvatars, userStories] = await Promise.all([
              dbService.getUserAvatars(user.id),
              dbService.getUserStories(user.id)
          ]);
          setAvatars(userAvatars);
          setStories(userStories);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  }, [user]);

  useEffect(() => {
    loadData();

    // Recarrega sempre que a janela ganhar foco (voltar do Leitor)
    const onFocus = () => loadData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadData]);

  const deleteAvatar = async (id: string) => {
    if (!user) return;
    if(confirm('Tem certeza que quer deletar este personagem?')) {
      try {
          await dbService.deleteAvatar(user.id, id);
          setAvatars(prev => prev.filter(a => a.id !== id));
      } catch (e) {
          alert("Erro ao deletar.");
      }
    }
  };

  const deleteStory = async (id: string) => {
    if (!user) return;
    if(confirm('Tem certeza que quer apagar esta história do acervo?')) {
      try {
          await dbService.deleteStory(user.id, id);
          setStories(prev => prev.filter(s => s.id !== id));
      } catch (e) {
          alert("Erro ao deletar.");
      }
    }
  };

  const filteredStories = stories.filter(story => {
    if (filter === 'all') return true;
    if (filter === 'educational') return story.isEducational === true;
    if (filter === 'adventure') return !story.isEducational;
    return true;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center font-comic text-2xl animate-bounce">Carregando Biblioteca...</div>;

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
