import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Avatar, SchoolMember, SchoolRole, Story } from '../types';
import { generatePedagogicalStory } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { dbService } from '../services/dbService';

const SchoolRoom: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
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
    if (user && !user.isSchoolUser) {
        navigate('/school-login');
        return;
    }
    const loadData = async () => {
        if (user) {
            try {
                const userAvatars = await dbService.getUserAvatars(user.id);
                setAvatars(userAvatars);
                const roster = await dbService.getSchoolRoster(user.id);
                setSchoolRoster(roster);
            } catch (e) {
                console.error("Erro ao carregar dados escolares", e);
            }
        }
    };
    loadData();
  }, [user, navigate]);

  const saveRoster = async (newRoster: SchoolMember[]) => {
    setSchoolRoster(newRoster);
    if (user) await dbService.saveSchoolRoster(user.id, newRoster);
  };

  const handleSlotClick = (slotId: string, role: SchoolRole) => {
    setSelectedSlotId(slotId);
    setIsSelectorOpen(true);
  };

  const assignAvatarToSlot = (avatarId: string) => {
    if (!selectedSlotId) return;
    const filteredRoster = schoolRoster.filter(m => m.slotId !== selectedSlotId);
    const role = 'student'; 
    const newMember: SchoolMember = { slotId: selectedSlotId, avatarId, role };
    saveRoster([...filteredRoster, newMember]);
    setIsSelectorOpen(false);
    setSelectedSlotId(null);
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
        alert("Máximo de 5 alunos por história!");
        return;
      }
      setParticipatingStudents(prev => [...prev, avatarId]);
    }
  };

  const handleStartLesson = async () => {
    if (!situation.trim() || !goal.trim()) { alert("Preencha a lousa!"); return; }
    if (!selectedTeacherId) { alert("Selecione um professor."); return; }
    if (participatingStudents.length === 0) { alert("Selecione alunos."); return; }
    if (!user) return;
    
    setLoading(true);
    const teacherAvatar = avatars.find(a => a.id === selectedTeacherId)!;
    const studentAvatars = avatars.filter(a => participatingStudents.includes(a.id));

    try {
      const storyData = await generatePedagogicalStory(situation, goal, teacherAvatar, studentAvatars);
      
      const storyId = crypto.randomUUID();
      const fullStory: Story = {
        id: storyId,
        createdAt: Date.now(),
        characters: [teacherAvatar, ...studentAvatars], 
        theme: `Aula: ${goal}`, 
        isPremium: true,
        isEducational: true,
        educationalGoal: goal,
        ...storyData
      };

      await authService.consumeStoryCredit(user.id, 'premium');
      refreshUser();

      // SALVAR DIRETAMENTE NO BANCO (SEM LOCALSTORAGE LIMITADO)
      await dbService.saveStory(user.id, fullStory);
      
      navigate(`/story/${storyId}`);

    } catch (e: any) {
      console.error(e);
      alert(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cartoon-blue via-blue-200 to-cartoon-green relative overflow-x-hidden pb-20">
      <div className="absolute top-10 left-10 text-8xl opacity-80 animate-float">☁️</div>
      <div className="absolute top-20 right-20 text-8xl opacity-60 animate-float" style={{animationDelay: '2s'}}>☁️</div>
      
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
                        📚 Abrir Biblioteca Escolar
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
                            <input value={situation} onChange={(e) => setSituation(e.target.value)} placeholder="Ex: Briga no recreio..." className="w-full bg-black/20 text-white font-hand text-xl placeholder-white/30 outline-none border-b border-white/10 p-2 focus:border-white/50 transition-colors" />
                        </div>
                        <div>
                            <label className="text-white/60 text-xs font-bold uppercase block mb-1">2. Objetivo BNCC</label>
                            <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ex: Resolver conflitos..." className="w-full bg-black/20 text-white font-hand text-xl placeholder-white/30 outline-none border-b border-white/10 p-2 focus:border-white/50 transition-colors" />
                        </div>
                    </div>
                    <div className="border-t-4 border-[#5c3a21] pt-4 mt-6">
                        <Button onClick={handleStartLesson} loading={loading} disabled={loading} variant="primary" className="w-full border-white text-white bg-green-700 hover:bg-green-600 shadow-none text-xl py-3">
                            {loading ? 'Escrevendo na Lousa...' : '✨ CRIAR FÁBULA EDUCATIVA'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white/30 backdrop-blur-sm rounded-hand p-8 border-4 border-white/50 mb-12 shadow-lg">
            <h2 className="text-center font-heading text-3xl text-white text-stroke-black mb-4">Corpo Docente</h2>
            <div className="flex flex-wrap justify-center gap-8">
                {[1, 2, 3, 4, 5].map(num => {
                    const slotId = `prof_${num}`;
                    const avatar = getAvatarInSlot(slotId);
                    return (
                        <div key={slotId} onClick={() => { if(avatar) setSelectedTeacherId(avatar.id); else handleSlotClick(slotId, 'teacher'); }} 
                             className={`w-24 h-24 rounded-full border-4 border-black cursor-pointer bg-yellow-100 flex items-center justify-center overflow-hidden ${selectedTeacherId === avatar?.id ? 'ring-4 ring-pink-500' : ''}`}>
                            {avatar ? <img src={avatar.imageUrl} className="w-full h-full object-cover"/> : <span>👤</span>}
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="bg-cartoon-green/90 rounded-[50px] p-8 border-t-[10px] border-green-800 shadow-2xl relative overflow-hidden">
            <h2 className="font-heading text-4xl text-white text-stroke-black mb-4 text-center">Turma 2024 🎒</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-10 gap-y-8 gap-x-4 relative z-10 pb-8">
                {Array.from({ length: 30 }).map((_, idx) => {
                    const num = idx + 1;
                    const slotId = `aluno_${num < 10 ? '0'+num : num}`;
                    const avatar = getAvatarInSlot(slotId);
                    const isParticipating = avatar && participatingStudents.includes(avatar.id);
                    return (
                        <div key={slotId} className="flex flex-col items-center">
                            <button onClick={() => { if (!avatar) handleSlotClick(slotId, 'student'); else toggleStudentParticipation(avatar.id); }}
                                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center ${avatar ? 'bg-white border-black' : 'bg-green-700/50 border-green-900'} ${isParticipating ? 'ring-4 ring-yellow-400 scale-110' : ''}`}>
                                {avatar ? <img src={avatar.imageUrl} className="w-full h-full rounded-full object-cover" /> : <span className="text-white/30">{num}</span>}
                            </button>
                            {avatar && <span className="text-[10px] bg-white px-1 rounded mt-1 font-bold">{avatar.name}</span>}
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
                    <button onClick={() => setIsSelectorOpen(false)} className="text-2xl font-bold">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto grid grid-cols-2 sm:grid-cols-4 gap-4 p-2">
                    <button onClick={() => navigate('/avatars?returnTo=/school')} className="border-2 border-dashed border-gray-400 rounded-xl p-2 flex flex-col items-center justify-center gap-2 hover:bg-blue-100">
                        <span className="text-4xl">+</span><span className="font-bold text-sm text-center">Criar Novo</span>
                    </button>
                    {avatars.map(av => (
                        <button key={av.id} onClick={() => assignAvatarToSlot(av.id)} className="border-2 border-black rounded-xl p-2 hover:bg-yellow-100 flex flex-col items-center">
                            <img src={av.imageUrl} className="w-16 h-16 rounded-full border border-black bg-white" />
                            <span className="font-bold text-sm truncate w-full text-center">{av.name}</span>
                        </button>
                    ))}
                </div>
            </Card>
        </div>
      )}
    </div>
  );
};

export default SchoolRoom;