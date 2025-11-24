
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Avatar, Story } from '../types';

type FilterType = 'all' | 'adventure' | 'educational';

const Library: React.FC = () => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

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
    if(confirm('Tem certeza que quer apagar esta história do acervo?')) {
      const updated = stories.filter(s => s.id !== id);
      setStories(updated);
      localStorage.setItem('savedStories', JSON.stringify(updated));
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

      {/* Seção de Histórias (Acervo) */}
      <section>
        <div className="flex flex-col md:flex-row items-end md:items-center justify-between mb-6 gap-4">
          <h2 className="font-comic text-3xl text-black bg-cartoon-blue text-white px-4 py-1 inline-block border-[3px] border-black rounded-hand -rotate-1">
            Minhas Histórias ({stories.length})
          </h2>
          
          {/* Filtros / Abas */}
          <div className="flex bg-white rounded-xl border-2 border-black p-1 shadow-sm">
             <button 
               onClick={() => setFilter('all')}
               className={`px-4 py-1 rounded-lg font-bold transition-colors ${filter === 'all' ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-500'}`}
             >
               Todas
             </button>
             <button 
               onClick={() => setFilter('adventure')}
               className={`px-4 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${filter === 'adventure' ? 'bg-cartoon-orange text-white' : 'hover:bg-orange-50 text-gray-500'}`}
             >
               🚀 Aventuras
             </button>
             <button 
               onClick={() => setFilter('educational')}
               className={`px-4 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${filter === 'educational' ? 'bg-cartoon-green text-black' : 'hover:bg-green-50 text-gray-500'}`}
             >
               🏫 Acervo Escolar
             </button>
          </div>
        </div>

        {/* Create Buttons */}
        <div className="flex gap-4 mb-8 justify-end">
             <Link to="/create-story">
                <Button size="sm" variant="danger" className="text-sm">Nova Aventura 🚀</Button>
             </Link>
             <Link to="/school">
                <Button size="sm" variant="success" className="text-sm">Nova Aula 🏫</Button>
             </Link>
        </div>

        {filteredStories.length === 0 ? (
           <div className="text-center py-16 border-4 border-dashed border-gray-300 rounded-3xl bg-gray-50">
             <p className="font-comic text-3xl text-gray-400 mb-2">
                {filter === 'educational' ? 'Nenhuma aula arquivada.' : 'Sua estante de livros está vazia.'}
             </p>
             <p className="text-gray-500">Crie uma nova história para começar sua coleção!</p>
           </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredStories.map((story) => (
              <div key={story.id} className="relative group h-full">
                {/* 
                    Lógica de Design do Card:
                    Escola = Verde, Tape "AULA", ícones escolares.
                    Aventura = Laranja, Tape "LIVRO".
                */}
                <Card 
                    color={story.isEducational ? 'green' : 'orange'} 
                    tape 
                    title={story.isEducational ? 'ACERVO' : 'LIVRO'} 
                    className={`h-full flex flex-col justify-between bg-white transition-colors ${story.isEducational ? 'group-hover:bg-green-50' : 'group-hover:bg-orange-50'}`}
                >
                  <div>
                    {story.isEducational && (
                        <div className="absolute top-2 right-12 text-2xl opacity-50 rotate-12">🍎</div>
                    )}
                    
                    <h3 className="font-heading text-2xl mb-2 leading-tight pr-8">{story.title}</h3>
                    <p className={`font-sans text-sm mb-4 italic border-l-4 pl-2 ${story.isEducational ? 'text-green-800 border-green-500' : 'text-gray-600 border-orange-400'}`}>
                        "{story.theme}"
                    </p>
                    
                    {/* Character Preview */}
                    <div className="flex -space-x-2 mb-4 overflow-hidden py-1">
                      {story.characters.slice(0, 5).map(c => (
                        <img key={c.id} src={c.imageUrl} className="w-10 h-10 rounded-full border-2 border-black bg-white object-cover" title={c.name} />
                      ))}
                      {story.characters.length > 5 && (
                          <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-200 flex items-center justify-center text-xs font-bold">
                              +{story.characters.length - 5}
                          </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 border-t-2 border-black/10 pt-4">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-500">
                        {new Date(story.createdAt).toLocaleDateString()}
                        </span>
                        {story.isEducational && <span className="text-[10px] font-bold bg-black text-white px-1 rounded w-max">PEDAGÓGICO</span>}
                    </div>
                    
                    <Link to={`/story/${story.id}`}>
                      <Button size="sm" variant={story.isEducational ? 'primary' : 'success'}>Ler Agora 📖</Button>
                    </Link>
                  </div>
                  
                  <button 
                    onClick={() => deleteStory(story.id)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xl bg-white/50 rounded-full w-8 h-8"
                    title="Apagar do acervo"
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
