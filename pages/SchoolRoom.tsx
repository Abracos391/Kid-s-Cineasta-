
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Avatar, SchoolMember, SchoolRole } from '../types';
import { generatePedagogicalStory } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const SchoolRoom: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  
  useEffect(() => {
    if (user && !user.isSchoolUser) {
        navigate('/school-login');
    }
  }, [user, navigate]);

  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [schoolRoster, setSchoolRoster] = useState<SchoolMember[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [situation, setSituation] = useState('');
  const [goal, setGoal] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [participatingStudents, setParticipatingStudents] = useState<string[]>([]);

  useEffect(() => {
    const savedAvatars = JSON.parse(localStorage.getItem('avatars') || '[]');
    setAvatars(savedAvatars);

    const savedRoster = JSON.parse(localStorage.getItem('schoolRoster') || '[]');
    setSchoolRoster(savedRoster);
  }, [location]);

  const saveRoster = (newRoster: SchoolMember[]) => {
    setSchoolRoster(newRoster);
    localStorage.setItem('schoolRoster', JSON.stringify(newRoster));
  };

  const handleSlotClick = (slotId: string, role: SchoolRole) => {
    setSelectedSlotId(slotId);
    setIsSelectorOpen(true);
  };

  const assignAvatarToSlot = (avatarId: string) => {
    if (!selectedSlotId) return;
    const filteredRoster = schoolRoster.filter(m => m.slotId !== selectedSlotId);
    const role = getRoleFromSlotId(selectedSlotId);
    const newMember: SchoolMember = { slotId: selectedSlotId, avatarId, role };
    saveRoster([...filteredRoster, newMember]);
    setIsSelectorOpen(false);
    setSelectedSlotId(null);
  };

  const getRoleFromSlotId = (id: string): SchoolRole => {
    if (id === 'dir') return 'director';
    if (id === 'vice') return 'vice_director';
    if (id.startsWith('prof')) return 'teacher';
    return 'student';
  };

  const getAvatarInSlot = (slotId: string) => {
    const member = schoolRoster.find(m => m.slotId === slotId);
    if (!member) return null;
    return avatars.find(a => a.id === member.avatarId);
  };

  const toggleStudentParticipation = (avatarId: string) => {
    if (participatingStudents.includes(avatarId)) {
      setParticipatingStudents(prev => prev.filter(id => id !== avatarId));
    } else {
      if (participatingStudents.length >= 5) {
        alert("Máximo de 5 alunos por história para manter o foco pedagógico!");
        return;
      }
      setParticipatingStudents(prev => [...prev, avatarId]);
    }
  };

  const handleStartLesson = async () => {
    if (!situation.trim() || !goal.trim()) {
      alert("Preencha a situação e o objetivo na lousa!");
      return;
    }
    if (!selectedTeacherId) {
      alert("Selecione um professor (clique no avatar do professor).");
      return;
    }
    if (participatingStudents.length === 0) {
      alert("Selecione pelo menos um aluno.");
      return;
    }
    if (!user) return;
    
    setLoading(true);

    const teacherAvatar = avatars.find(a => a.id === selectedTeacherId)!;
    const studentAvatars = avatars.filter(a => participatingStudents.includes(a.id));

    try {
      console.log("Gerando aula...");
      const storyData = await generatePedagogicalStory(situation, goal, teacherAvatar, studentAvatars);
      
      const fullStory = {
        id: Date.now().toString(),
        createdAt: Date.now(),
        characters: [teacherAvatar, ...studentAvatars], 
        theme: `Aula: ${goal}`, 
        isPremium: true,
        isEducational: true,
        educationalGoal: goal,
        ...storyData
      };

      // Consome Crédito
      authService.consumeStoryCredit(user.id, 'premium');
      refreshUser();

      // --- SALVAMENTO CRÍTICO ---
      // 1. Salva no currentStory para leitura IMEDIATA (prioridade máxima)
      try {
        localStorage.setItem('currentStory', JSON.stringify(fullStory));
      } catch (e) {
          alert("Erro crítico: Não há memória para abrir a história. Limpe o navegador.");
          setLoading(false);
          return;
      }

      // 2. Tenta salvar no Arquivo Permanente (savedStories)
      try {
        const savedStoriesRaw = localStorage.getItem('savedStories');
        const existingStories = savedStoriesRaw ? JSON.parse(savedStoriesRaw) : [];
        const newSavedStories = [fullStory, ...existingStories];
        localStorage.setItem('savedStories', JSON.stringify(newSavedStories));
      } catch (storageError: any) {
        console.warn("Memória cheia ao arquivar, tentando compressão...");
        
        if (storageError.name === 'QuotaExceededError' || storageError.code === 22) {
             // Fallback: Tenta salvar apenas o TEXTO da nova história e das antigas
             // Remove áudios e imagens base64 para caber no LocalStorage
             try {
                const savedStoriesRaw = localStorage.getItem('savedStories');
                const existingStories = savedStoriesRaw ? JSON.parse(savedStoriesRaw) : [];
                
                const compactedStories = existingStories.map((s: any) => ({
                    ...s,
                    chapters: s.chapters.map((c: any) => ({
                        ...c,
                        generatedAudio: undefined, 
                        generatedImage: undefined  
                    }))
                }));
                
                // Salva a nova também sem assets se necessário, mas tenta manter
                const newSavedStories = [fullStory, ...compactedStories];
                localStorage.setItem('savedStories', JSON.stringify(newSavedStories));
                // O usuário verá um aviso na próxima tela, mas o arquivo está salvo
             } catch (finalError) {
                 console.error("Falha total no arquivamento.");
             }
        }
      }

      // Redireciona
      navigate(`/story/${fullStory.id}`);

    } catch (e: any) {
      console.error("Erro na geração:", e);
      alert(`Erro ao criar aula: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cartoon-blue via-blue-200 to-cartoon-green relative overflow-x-hidden pb-20">
      <div className="absolute top-10 left-10 text-8xl opacity-80 animate-float">☁️</div>
      <div className="absolute top-20 right-20 text-8xl opacity-60 animate-float" style={{animationDelay: '2s'}}>☁️</div>
      <div className="absolute top-5 right-1/2 text-9xl animate-spin-slow text-cartoon-yellow origin-center">☀️</div>

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-12">
            <div className="lg:w-1/3">
                <h1 className="font-comic text-6xl text-white text-stroke-black drop-shadow-lg mb-2">Escola da Vida 🏫</h1>
                <div className="bg-[#1a3c28] text-white p-4 rounded-lg shadow-lg border border-[#8B4513]">
                    <p className="font-bold text-lg mb-1">{user?.name}</p>
                    <p className="text-xs text-white/60 uppercase tracking-widest">Sessão Educador</p>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                     <button onClick={() => navigate('/school-library')} className="bg-white text-black px-4 py-3 rounded-lg font-bold border-2 border-black hover:bg-gray-100 shadow-sm text-center">
                        📂 Abrir Arquivo Escolar
                    </button>
                    <button onClick={() => navigate('/')} className="text-white/80 hover:text-white underline font-bold px-4 py-2 text-sm text-left">
                        ← Voltar para Menu Principal
                    </button>
                </div>
            </div>

            <div className="relative group perspective-1000 w-full lg:w-[600px]">
                <div className="bg-[#1a3c28] border-[12px] border-[#8B4513] rounded-sm p-6 shadow-2xl transform rotate-1 transition-transform group-hover:rotate-0">
                    <div className="flex justify-between items-center border-b border-white/20 pb-2 mb-4">
                        <span className="text-white/70 font-comic text-lg">Planejamento da Aula (IA)</span>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-white/60 text-xs font-bold uppercase block mb-1">1. Fato do Cotidiano</label>
                            <input 
                                value={situation}
                                onChange={(e) => setSituation(e.target.value)}
                                placeholder="Ex: Briga no recreio..."
                                className="w-full bg-black/20 text-white font-hand text-xl placeholder-white/30 outline-none border-b border-white/10 p-2 focus:border-white/50 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-white/60 text-xs font-bold uppercase block mb-1">2. Objetivo BNCC</label>
                            <input 
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                placeholder="Ex: Resolver conflitos..."
                                className="w-full bg-black/20 text-white font-hand text-xl placeholder-white/30 outline-none border-b border-white/10 p-2 focus:border-white/50 transition-colors"
                            />
                        </div>
                    </div>
                    <div className="border-t-4 border-[#5c3a21] pt-4 mt-6">
                        <div className="bg-[#a05a2c] h-3 w-full rounded-full opacity-50 mb-4 mx-auto"></div>
                        <Button 
                            onClick={handleStartLesson}
                            loading={loading}
                            disabled={loading}
                            variant="primary" 
                            className="w-full border-white text-white bg-green-700 hover:bg-green-600 shadow-none text-xl py-3"
                        >
                            {loading ? 'Gerando Material...' : '✨ CRIAR FÁBULA EDUCATIVA'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white/30 backdrop-blur-sm rounded-hand p-8 border-4 border-white/50 mb-12 shadow-lg">
            <div className="flex items-center justify-center gap-4 mb-6">
                 <span className="text-4xl">🍎</span>
                 <h2 className="text-center font-heading text-3xl text-white text-stroke-black">Corpo Docente</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-8">
                {[1, 2, 3, 4, 5].map(num => {
                    const slotId = `prof_${num}`;
                    const avatar = getAvatarInSlot(slotId);
                    const isSelected = avatar && selectedTeacherId === avatar.id;
                    return (
                        <SchoolSeat 
                            key={slotId}
                            slotId={slotId} 
                            label={`Prof. ${num}`} 
                            avatar={avatar} 
                            onClick={() => {
                                if (avatar) setSelectedTeacherId(avatar.id);
                                else handleSlotClick(slotId, 'teacher');
                            }}
                            onEdit={() => handleSlotClick(slotId, 'teacher')}
                            color="bg-yellow-100"
                            isSelected={isSelected}
                        />
                    );
                })}
            </div>
        </div>

        <div className="bg-cartoon-green/90 rounded-[50px] p-8 border-t-[10px] border-green-800 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 text-center mb-8">
                <h2 className="font-heading text-4xl text-white text-stroke-black inline-block transform -rotate-1">Turma 2024 🎒</h2>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-10 gap-y-8 gap-x-4 relative z-10 pb-8">
                {Array.from({ length: 30 }).map((_, idx) => {
                    const num = idx + 1;
                    const slotId = `aluno_${num < 10 ? '0'+num : num}`;
                    const avatar = getAvatarInSlot(slotId);
                    const isParticipating = avatar && participatingStudents.includes(avatar.id);

                    return (
                        <div key={slotId} className="flex flex-col items-center group">
                            <button
                                onClick={() => {
                                    if (!avatar) handleSlotClick(slotId, 'student');
                                    else toggleStudentParticipation(avatar.id);
                                }}
                                className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-2 flex items-center justify-center transition-all transform shadow-lg relative
                                    ${avatar ? 'bg-white border-black hover:scale-110' : 'bg-green-700/50 border-green-900 border-dashed hover:bg-green-600/50'}
                                    ${isParticipating ? 'ring-4 ring-cartoon-yellow scale-110 z-10' : ''}
                                `}
                            >
                                {avatar ? (
                                    <>
                                        <img src={avatar.imageUrl} className="w-full h-full rounded-full object-cover" />
                                        {isParticipating && <div className="absolute -top-3 -right-3 text-2xl drop-shadow-md animate-bounce">🙋</div>}
                                    </>
                                ) : (
                                    <span className="text-white/30 font-comic text-sm">{num}</span>
                                )}
                            </button>
                            {avatar && (
                                <span className={`bg-white px-2 py-0.5 rounded text-[10px] font-bold mt-2 max-w-[70px] truncate border border-black shadow-sm transition-opacity ${isParticipating ? 'bg-yellow-100 scale-110' : 'opacity-70 group-hover:opacity-100'}`}>
                                    {avatar.name}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {isSelectorOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <Card color="white" className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b-2 border-gray-100 pb-2">
                    <h3 className="font-heading text-2xl">Chamada Escolar</h3>
                    <button onClick={() => setIsSelectorOpen(false)} className="text-2xl font-bold bg-gray-100 w-10 h-10 rounded-full hover:bg-red-100 hover:text-red-500">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto grid grid-cols-2 sm:grid-cols-4 gap-4 p-2">
                    <button 
                        onClick={() => navigate('/avatars?returnTo=/school')}
                        className="border-2 border-dashed border-gray-400 rounded-xl p-2 flex flex-col items-center justify-center gap-2 hover:bg-cartoon-blue hover:text-white hover:border-black transition-colors min-h-[120px]"
                    >
                        <span className="text-4xl">+</span>
                        <span className="font-bold text-sm text-center">Criar Novo</span>
                    </button>
                    {avatars.map(av => {
                         const isSeated = schoolRoster.some(m => m.avatarId === av.id && m.slotId !== selectedSlotId);
                         return (
                            <button 
                                key={av.id}
                                onClick={() => assignAvatarToSlot(av.id)}
                                disabled={isSeated}
                                className={`border-2 rounded-xl p-2 transition-all flex flex-col items-center gap-2 group
                                    ${isSeated ? 'border-gray-200 opacity-50 bg-gray-50 cursor-not-allowed' : 'border-black hover:bg-cartoon-yellow cursor-pointer'}
                                `}
                            >
                                <img src={av.imageUrl} className="w-16 h-16 rounded-full border border-black bg-white" />
                                <span className="font-bold text-sm truncate w-full text-center">{av.name}</span>
                            </button>
                         );
                    })}
                </div>
                <div className="p-4 bg-gray-50 border-t-2 border-gray-100">
                    <button 
                        onClick={() => {
                             const filteredRoster = schoolRoster.filter(m => m.slotId !== selectedSlotId);
                             saveRoster(filteredRoster);
                             setIsSelectorOpen(false);
                        }}
                        className="text-red-500 font-bold text-sm hover:underline"
                    >
                        Esvaziar Lugar
                    </button>
                </div>
            </Card>
        </div>
      )}
    </div>
  );
};

const SchoolSeat: React.FC<any> = ({ label, avatar, onClick, onEdit, color, isSelected }) => (
    <div className="flex flex-col items-center group relative">
        <div className={`
            w-24 h-24 md:w-32 md:h-32 rounded-hand border-4 border-black shadow-doodle flex items-center justify-center relative overflow-hidden transition-transform cursor-pointer
            ${color} ${isSelected ? 'ring-4 ring-cartoon-pink scale-110 z-20' : 'hover:scale-105'}
        `} onClick={onClick}>
            {avatar ? <img src={avatar.imageUrl} className="w-full h-full object-cover" /> : <span className="text-4xl opacity-20">👤</span>}
            {avatar && onEdit && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="absolute top-1 right-1 bg-white border border-black rounded-full w-7 h-7 flex items-center justify-center text-xs hover:bg-gray-200 z-10 shadow-sm"
                >✏️</button>
            )}
            {isSelected && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><span className="text-4xl">✅</span></div>}
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-comic mt-2 border-2 shadow-sm z-10 transition-colors ${isSelected ? 'bg-cartoon-pink text-white border-black font-bold' : 'bg-black text-white border-white'}`}>
            {avatar ? avatar.name : label}
        </div>
    </div>
);

export default SchoolRoom;
