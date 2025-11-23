
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Avatar, Story } from '../types';

const Library: React.FC = () => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    const savedAvatars = JSON.parse(localStorage.getItem('avatars') || '[]');
    const savedStories = JSON.parse(localStorage.getItem('savedStories') || '[]');
    setAvatars(savedAvatars);
    setStories(savedStories);
  }, []);

  const deleteAvatar = (id: string) => {
    if(confirm('Tem certeza que quer deletar este personagem?')) {
      const updated = avatars.filter(a => a.id !== id);
      setAvatars(updated);
      localStorage.setItem('avatars', JSON.stringify(updated));
    }
  };

  const deleteStory = (id: string) => {
    if(confirm('Tem certeza que quer apagar esta história?')) {
      const updated = stories.filter(s => s.id !== id);
      setStories(updated);
      localStorage.setItem('savedStories', JSON.stringify(updated));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      <h1 className="font-heading text-5xl text-center text-cartoon-purple text-stroke-black drop-shadow-md mb-12">
        Minha Biblioteca Mágica 🏰
      </h1>

      {/* Seção de Avatares */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-comic text-3xl text-black bg-cartoon-yellow px-4 py-1 inline-block border-[3px] border-black rounded-hand rotate-1">
            Meus Personagens ({avatars.length})
          </h2>
          <Link to="/avatars">
            <Button size="sm" variant="primary">+ Novo</Button>
          </Link>
        </div>

        {avatars.length === 0 ? (
           <div className="text-center py-12 border-4 border-dashed border-gray-300 rounded-3xl">
             <p className="font-comic text-2xl text-gray-400">Nenhum personagem criado ainda.</p>
           </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {avatars.map((avatar) => (
              <div key={avatar.id} className="relative group">
                <Card color="white" className="p-2 text-center h-full">
                  <img src={avatar.imageUrl} alt={avatar.name} className="w-32 h-32 mx-auto rounded-full border-4 border-black object-cover bg-gray-100 mb-2" />
                  <h3 className="font-heading text-xl truncate">{avatar.name}</h3>
                  <button 
                    onClick={() => deleteAvatar(avatar.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full border-2 border-black font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    X
                  </button>
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Seção de Histórias */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-comic text-3xl text-black bg-cartoon-blue text-white px-4 py-1 inline-block border-[3px] border-black rounded-hand -rotate-1">
            Minhas Histórias ({stories.length})
          </h2>
          <Link to="/create-story">
            <Button size="sm" variant="danger">+ Nova História</Button>
          </Link>
        </div>

        {stories.length === 0 ? (
           <div className="text-center py-12 border-4 border-dashed border-gray-300 rounded-3xl">
             <p className="font-comic text-2xl text-gray-400">Sua estante de livros está vazia.</p>
           </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stories.map((story) => (
              <div key={story.id} className="relative group h-full">
                <Card color="orange" tape title="LIVRO" className="h-full flex flex-col justify-between bg-white group-hover:bg-orange-50 transition-colors">
                  <div>
                    <h3 className="font-heading text-2xl mb-2 leading-tight">{story.title}</h3>
                    <p className="font-sans text-sm text-gray-600 mb-4 italic">"{story.theme}"</p>
                    <div className="flex -space-x-2 mb-4">
                      {story.characters.slice(0,3).map(c => (
                        <img key={c.id} src={c.imageUrl} className="w-10 h-10 rounded-full border-2 border-black bg-white" title={c.name} />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4 border-t-2 border-black/10 pt-4">
                    <span className="text-xs font-bold text-gray-500">
                      {new Date(story.createdAt).toLocaleDateString()}
                    </span>
                    <Link to={`/story/${story.id}`}>
                      <Button size="sm" variant="success">Ler Agora 📖</Button>
                    </Link>
                  </div>
                  
                  <button 
                    onClick={() => deleteStory(story.id)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xl"
                    title="Apagar livro"
                  >
                    🗑️
                  </button>
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