
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Story } from '../types';

const SchoolLibrary: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    // Carrega TODAS as histórias, mas filtra APENAS as educacionais
    const savedStories: Story[] = JSON.parse(localStorage.getItem('savedStories') || '[]');
    const schoolStories = savedStories.filter(s => s.isEducational === true);
    setStories(schoolStories);
  }, []);

  const deleteStory = (id: string) => {
    if(confirm('Professor(a), deseja remover este material didático da biblioteca?')) {
      const allStories: Story[] = JSON.parse(localStorage.getItem('savedStories') || '[]');
      const updated = allStories.filter(s => s.id !== id);
      localStorage.setItem('savedStories', JSON.stringify(updated));
      
      // Atualiza estado local
      setStories(stories.filter(s => s.id !== id));
    }
  };

  const getStoryStatus = (story: Story) => {
      const totalChapters = story.chapters?.length || 0;
      const audioCount = story.chapters?.filter(c => !!c.generatedAudio).length || 0;
      const imageCount = story.chapters?.filter(c => !!c.generatedImage).length || 0;
      
      return {
          hasAudio: audioCount > 0,
          hasImages: imageCount > 0,
          complete: audioCount === totalChapters && imageCount === totalChapters
      }
  }

  return (
    <div className="min-h-screen bg-[#f0f4f1] p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12 border-b-2 border-gray-300 pb-4">
            <div>
                <h1 className="text-4xl font-bold text-[#1a3c28] flex items-center gap-3">
                    <span className="text-5xl">📚</span> Biblioteca Escolar
                </h1>
                <p className="text-gray-600 mt-2">Repositório de fábulas e sequências didáticas da Escola.</p>
            </div>
            <div className="flex gap-4">
                <Link to="/school">
                    <Button variant="success" className="shadow-none border-2 border-[#1a3c28]">
                        + Nova Aula
                    </Button>
                </Link>
            </div>
        </div>

        {stories.length === 0 ? (
           <div className="text-center py-20 bg-white border-4 border-dashed border-gray-300 rounded-lg">
             <div className="text-6xl mb-4 opacity-30">🗂️</div>
             <p className="text-2xl text-gray-400 font-bold">A biblioteca está vazia.</p>
             <p className="text-gray-500 mt-2">Crie sua primeira fábula educativa na Sala de Aula.</p>
           </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stories.map((story) => {
                const status = getStoryStatus(story);
                return (
                    <div key={story.id} className="bg-white rounded-sm shadow-md border-l-8 border-[#1a3c28] hover:shadow-xl transition-shadow relative group">
                        {/* Header do Card (Parece pasta de arquivo) */}
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex justify-between items-start mb-2">
                                <span className="bg-[#1a3c28] text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">BNCC</span>
                                <div className="flex gap-1">
                                    {status.hasAudio && <span title="Possui Áudio" className="text-xs">🔊</span>}
                                    {status.hasImages && <span title="Possui Imagens" className="text-xs">🖼️</span>}
                                </div>
                            </div>
                            
                            <h3 className="font-heading text-2xl text-gray-800 leading-tight mb-2">{story.title}</h3>
                            <span className="text-gray-400 text-xs block mb-2">{new Date(story.createdAt).toLocaleDateString()}</span>

                            {story.educationalGoal && (
                                <p className="text-sm text-gray-500 italic bg-gray-50 p-2 rounded border border-gray-200">
                                    "Obj: {story.educationalGoal}"
                                </p>
                            )}
                        </div>

                        <div className="p-6 pt-4 flex justify-between items-center">
                            <div className="flex -space-x-2">
                                {story.characters.slice(0, 3).map(c => (
                                    <img key={c.id} src={c.imageUrl} className="w-8 h-8 rounded-full border border-white shadow-sm" title={c.name} />
                                ))}
                            </div>
                            
                            <div className="flex gap-2">
                                <Link to={`/story/${story.id}`}>
                                    <button className="text-[#1a3c28] font-bold hover:underline text-sm flex items-center gap-1">
                                        📖 Abrir Livro
                                    </button>
                                </Link>
                                <button 
                                    onClick={() => deleteStory(story.id)}
                                    className="text-red-400 hover:text-red-600 ml-2"
                                    title="Remover da Biblioteca"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolLibrary;
