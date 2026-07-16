import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { generateYoutubePromo, generateChapterIllustration } from '../services/geminiService';
import { Story, User } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Admin: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stories, setStories] = useState<Story[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [generatingPromo, setGeneratingPromo] = useState(false);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [generatedThumbnailUrl, setGeneratedThumbnailUrl] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = user && (
    user.whatsapp === 'olivalexcelso@gmail.com' || 
    user.whatsapp === 'admin' ||
    user.whatsapp?.includes('olivalexcelso') ||
    user.whatsapp === 'cineastakids.acao@gmail.com' ||
    user.name?.toLowerCase().includes('admin') ||
    user.plan === 'enterprise'
  );

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [allStories, allUsers] = await Promise.all([
          dbService.getAllStories(),
          dbService.getAllUsers()
        ]);
        
        // Ordena histórias pelas mais recentes primeiro
        setStories(allStories.sort((a, b) => b.createdAt - a.createdAt));
        setUsers(allUsers);
      } catch (e) {
        console.error("Erro ao carregar dados do admin:", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, isAdmin, navigate]);

  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGeneratePromo = async (story: Story) => {
    setGeneratingPromo(true);
    try {
      const chaptersText = story.chapters.map(c => `${c.title}: ${c.text}`).join("\n\n");
      const promo = await generateYoutubePromo(story.title, chaptersText);
      const updatedStory = { ...story, youtubePromo: promo };
      
      // Update locally
      setSelectedStory(updatedStory);
      setStories(prev => prev.map(s => s.id === story.id ? updatedStory : s));
      
      // Save to IndexedDB
      await dbService.updateStory(story.userId || user!.id, updatedStory);
      alert("Metadados gerados com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar metadados do YouTube.");
    } finally {
      setGeneratingPromo(false);
    }
  };

  const handleGenerateThumbnail = async (story: Story) => {
    if (!story.youtubePromo) return;
    setGeneratingThumbnail(true);
    try {
      const charsDesc = story.characters ? story.characters.map(c => `${c.name} (${c.description})`).join(', ') : '';
      const imageUrl = await generateChapterIllustration(story.youtubePromo.thumbnailPrompt, charsDesc);
      
      setGeneratedThumbnailUrl(imageUrl);
      alert("Thumbnail gerada com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar thumbnail.");
    } finally {
      setGeneratingThumbnail(false);
    }
  };

  if (!isAdmin) return null;

  const filteredStories = stories.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.theme.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-20 font-sans">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-slate-900 text-white p-6 rounded-3xl border-4 border-black shadow-cartoon">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-cartoon-yellow rounded-full border-4 border-black flex items-center justify-center text-3xl shadow-sm transform -rotate-6">
            🛡️
          </div>
          <div>
            <h1 className="font-comic text-3xl text-cartoon-yellow text-stroke-black leading-tight">Painel Administrativo</h1>
            <p className="text-sm text-slate-400 font-mono">Controle de Histórias, Divulgação e Thumbnails</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link to="/">
            <Button variant="secondary" size="sm">Voltar para o App 🏠</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cartoon-blue border-t-transparent mb-4"></div>
          <p className="font-comic text-xl font-bold">Carregando dados administrativos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* List of Stories Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="📜 Histórias do Sistema" color="yellow">
              
              {/* Search input */}
              <div className="mb-4">
                <input 
                  type="text" 
                  placeholder="🔍 Pesquisar histórias por título ou tema..." 
                  className="w-full p-3 border-3 border-black rounded-xl outline-none font-sans"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {filteredStories.length === 0 ? (
                <p className="text-center py-12 text-gray-500 font-bold">Nenhuma história encontrada.</p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {filteredStories.map((s) => {
                    const isSel = selectedStory?.id === s.id;
                    const formattedDate = new Date(s.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    });

                    return (
                      <div 
                        key={s.id}
                        onClick={() => {
                          setSelectedStory(s);
                          setGeneratedThumbnailUrl(null);
                        }}
                        className={`p-4 rounded-xl border-3 transition-all cursor-pointer text-left ${
                          isSel 
                            ? 'bg-cartoon-purple/10 border-cartoon-purple shadow-cartoon' 
                            : 'bg-white border-black hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h3 className="font-comic font-bold text-lg text-black">{s.title}</h3>
                          <span className="text-xs bg-gray-100 border border-black/20 px-2 py-0.5 rounded font-bold whitespace-nowrap">
                            {formattedDate}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 font-sans mb-3"><strong>Tema/Lição:</strong> {s.theme}</p>
                        
                        <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-gray-100">
                          <div className="flex gap-1.5">
                            {s.characters?.map((c, i) => (
                              <span key={i} className="text-xs bg-cartoon-yellow/20 text-yellow-800 border border-cartoon-yellow/50 px-2 py-0.5 rounded-full font-bold">
                                👤 {c.name}
                              </span>
                            ))}
                          </div>
                          
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${s.youtubePromo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {s.youtubePromo ? '✓ Metadados Gerados' : '✗ Sem Metadados'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card title="👥 Usuários Cadastrados" color="green">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-sans border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black bg-gray-50">
                      <th className="p-3 font-bold">Nome</th>
                      <th className="p-3 font-bold">WhatsApp / E-mail</th>
                      <th className="p-3 font-bold text-center">Plano</th>
                      <th className="p-3 font-bold text-center">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-3 font-bold">{u.name}</td>
                        <td className="p-3 font-mono text-xs">{u.whatsapp}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold text-xs uppercase ${
                            u.plan === 'enterprise' ? 'bg-red-100 text-red-800' :
                            u.plan === 'premium' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {u.plan}
                          </span>
                        </td>
                        <td className="p-3 text-center text-xs font-bold">
                          {u.isSchoolUser ? '🏫 Escola' : '👤 Padrão'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Details / Admin Controls Column */}
          <div className="space-y-6">
            <Card title="⚡ Detalhes de Divulgação" color="pink">
              {!selectedStory ? (
                <div className="text-center py-16 text-gray-500">
                  <span className="text-5xl block mb-3">👉</span>
                  <p className="font-comic font-bold">Selecione uma história na lista para ver e baixar seus títulos, tags e thumbnail de divulgação.</p>
                </div>
              ) : (
                <div className="space-y-6 text-left">
                  <div className="border-b border-black/10 pb-3">
                    <h3 className="font-comic font-bold text-xl text-cartoon-pink">{selectedStory.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">ID da História: <code className="font-mono bg-gray-100 p-0.5 rounded">{selectedStory.id}</code></p>
                    <div className="mt-3">
                      <Link to={`/story/${selectedStory.id}`}>
                        <Button variant="secondary" size="sm" className="w-full">📖 Abrir no Leitor de Histórias</Button>
                      </Link>
                    </div>
                  </div>

                  {!selectedStory.youtubePromo ? (
                    <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl">
                      <p className="text-sm text-gray-700 font-bold mb-4">Esta história não tem metadados de marketing gerados ainda.</p>
                      <Button
                        variant="primary"
                        onClick={() => handleGeneratePromo(selectedStory)}
                        loading={generatingPromo}
                        disabled={generatingPromo}
                        className="w-full"
                      >
                        ⚡ Gerar Metadados do YouTube
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Titles Sugeridos */}
                      <div className="bg-slate-900 text-white p-4 rounded-xl border-3 border-black shadow-cartoon">
                        <h4 className="font-comic font-bold text-yellow-400 mb-2">🎯 Títulos de Alto Impacto (CTR)</h4>
                        <div className="space-y-2">
                          {selectedStory.youtubePromo.titles.map((titleText, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-800 p-2 rounded text-xs gap-2 border border-slate-700">
                              <span className="font-bold">{titleText}</span>
                              <button
                                onClick={() => handleCopyToClipboard(titleText, `title-${idx}`)}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold px-2 py-1 rounded text-[10px]"
                              >
                                {copiedField === `title-${idx}` ? 'Copiado!' : 'Copiar'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Descrição SEO */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block font-bold text-sm">📝 Descrição Otimizada (SEO):</label>
                          <button
                            onClick={() => handleCopyToClipboard(selectedStory.youtubePromo!.description, 'desc')}
                            className="text-xs text-blue-600 font-bold hover:underline"
                          >
                            {copiedField === 'desc' ? 'Copiado!' : 'Copiar tudo'}
                          </button>
                        </div>
                        <textarea
                          readOnly
                          value={selectedStory.youtubePromo.description}
                          className="w-full h-28 p-2 border-2 border-black rounded-lg font-sans text-xs bg-gray-50 outline-none resize-none"
                        />
                      </div>

                      {/* Tags */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block font-bold text-sm">🏷️ Palavras-Chave (Tags):</label>
                          <button
                            onClick={() => handleCopyToClipboard(selectedStory.youtubePromo!.tags.join(', '), 'tags')}
                            className="text-xs text-blue-600 font-bold hover:underline"
                          >
                            {copiedField === 'tags' ? 'Copiado!' : 'Copiar tags'}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 bg-gray-50 border-2 border-black p-2.5 rounded-lg max-h-24 overflow-y-auto">
                          {selectedStory.youtubePromo.tags.map((tag, idx) => (
                            <span key={idx} className="bg-gray-200 text-black border border-black/10 text-[10px] px-2 py-0.5 rounded font-mono">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Video Aspect Ratio Selector */}
                      <div className="border-t border-black/10 pt-4">
                        <h4 className="font-comic font-bold text-lg mb-1">📹 Formato de Vídeo Viral</h4>
                        <p className="text-xs text-gray-500 mb-3">Selecione o formato para as renderizações automáticas na nuvem (Shotstack) ou locais:</p>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              const updatedStory = { ...selectedStory, videoAspectRatio: '16:9' };
                              setSelectedStory(updatedStory);
                              setStories(prev => prev.map(s => s.id === selectedStory.id ? updatedStory : s));
                              await dbService.updateStory(selectedStory.userId || user!.id, updatedStory);
                            }}
                            className={`flex-1 py-2 rounded-lg font-bold text-xs border-2 transition-all ${
                              (selectedStory.videoAspectRatio || '16:9') === '16:9'
                                ? 'bg-indigo-600 border-indigo-400 text-white shadow-cartoon font-black'
                                : 'bg-transparent border-gray-300 text-gray-500 hover:text-black hover:border-black'
                            }`}
                          >
                            📺 Paisagem (16:9 - YouTube)
                          </button>
                          <button
                            onClick={async () => {
                              const updatedStory = { ...selectedStory, videoAspectRatio: '9:16' };
                              setSelectedStory(updatedStory);
                              setStories(prev => prev.map(s => s.id === selectedStory.id ? updatedStory : s));
                              await dbService.updateStory(selectedStory.userId || user!.id, updatedStory);
                            }}
                            className={`flex-1 py-2 rounded-lg font-bold text-xs border-2 transition-all ${
                              selectedStory.videoAspectRatio === '9:16'
                                ? 'bg-indigo-600 border-indigo-400 text-white shadow-cartoon font-black'
                                : 'bg-transparent border-gray-300 text-gray-500 hover:text-black hover:border-black'
                            }`}
                          >
                            📱 Retrato (9:16 - Reels)
                          </button>
                        </div>
                      </div>

                      {/* Thumbnail section */}
                      <div className="border-t border-black/10 pt-4">
                        <h4 className="font-comic font-bold text-lg mb-2">🖼️ Capa / Thumbnail do YouTube</h4>
                        <div className="bg-yellow-50 border-2 border-yellow-300 p-3 rounded-lg text-xs text-yellow-800 mb-3">
                          <p className="font-bold mb-1">💡 Ideia de Layout para o Canva:</p>
                          <p className="italic">"{selectedStory.youtubePromo.thumbnailIdea}"</p>
                        </div>

                        <Button
                          onClick={() => handleGenerateThumbnail(selectedStory)}
                          loading={generatingThumbnail}
                          disabled={generatingThumbnail}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm"
                        >
                          {generatingThumbnail ? 'Gerando Ilustração de Capa...' : '🎨 Gerar Imagem da Capa pelo Gemini'}
                        </Button>

                        {generatedThumbnailUrl && (
                          <div className="mt-4 bg-white p-3 rounded-xl border-3 border-black shadow-cartoon text-center">
                            <p className="text-xs font-bold text-indigo-600 mb-2">✨ Thumbnail Gerada com Sucesso!</p>
                            <img 
                              src={generatedThumbnailUrl} 
                              alt="Capa do YouTube" 
                              className="w-full max-h-48 object-cover rounded border-2 border-black mb-3" 
                            />
                            <a
                              href={generatedThumbnailUrl}
                              download={`Thumbnail_${selectedStory.title.replace(/\s+/g, '_')}.jpg`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-lg border-2 border-black text-xs shadow-doodle"
                            >
                              📥 Baixar Imagem da Capa
                            </a>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

        </div>
      )}

    </div>
  );
};

export default Admin;
