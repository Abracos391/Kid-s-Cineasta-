import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Story } from '../types';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';

const SchoolLibrary: React.FC = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadStories = async () => {
        setLoading(true);
        try {
            const userStories = await dbService.getUserStories(user.id);
            setStories(userStories.filter((s: Story) => s.isEducational));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    loadStories();
  }, [user]);

  const deleteStory = async (id: string) => {
    if (!user) return;
    if(confirm('Remover material didático?')) {
      try {
          await dbService.deleteStory(user.id, id);
          setStories(prev => prev.filter(s => s.id !== id));
      } catch (e) {
          alert("Erro ao deletar.");
      }
    }
  };

  const getStoryStatus = (story: Story) => {
      const audioCount = story.chapters?.filter(c => !!c.generatedAudio).length || 0;
      const imageCount = story.chapters?.filter(c => !!c.generatedImage).length || 0;
      return { hasAudio: audioCount > 0, hasImages: imageCount > 0 };
  }

  if (loading) return <div className="min-h-screen bg-[#f0f4f1] p-8 flex items-center justify-center font-bold text-[#1a3c28]">Carregando Acervo...</div>;

  return (
    <div className="min-h-screen bg-[#f0f4f1] p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12 border-b-2 border-gray-300 pb-4">
            <h1 className="text-4xl font-bold text-[#1a3c28]">📚 Biblioteca Escolar</h1>
            <Link to="/school"><Button variant="success" className="shadow-none border-2 border-[#1a3c28]">+ Nova Aula</Button></Link>
        </div>

        {stories.length === 0 ? (
           <div className="text-center py-20 bg-white border-4 border-dashed border-gray-300 rounded-lg">
             <p className="text-2xl text-gray-400 font-bold">A biblioteca está vazia.</p>
           </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stories.map((story) => {
                const status = getStoryStatus(story);
                return (
                    <div key={story.id} className="bg-white rounded-sm shadow-md border-l-8 border-[#1a3c28] hover:shadow-xl transition-shadow relative group">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex justify-between items-start mb-2">
                                <span className="bg-[#1a3c28] text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">BNCC</span>
                                <div className="flex gap-1">
                                    {status.hasAudio && <span title="Possui Áudio" className="text-xs">🔊</span>}
                                    {status.hasImages && <span title="Possui Imagens" className="text-xs">🖼️</span>}
                                </div>
                            </div>
                            <h3 className="font-heading text-2xl text-gray-800 leading-tight mb-2">{story.title}</h3>
                            {story.educationalGoal && <p className="text-sm text-gray-500 italic bg-gray-50 p-2 rounded border border-gray-200">"Obj: {story.educationalGoal}"</p>}
                        </div>
                        <div className="p-6 pt-4 flex justify-between items-center">
                            <Link to={`/story/${story.id}`}><button className="text-[#1a3c28] font-bold hover:underline text-sm">📖 Abrir Livro</button></Link>
                            <button onClick={() => deleteStory(story.id)} className="text-red-400 hover:text-red-600">🗑️</button>
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