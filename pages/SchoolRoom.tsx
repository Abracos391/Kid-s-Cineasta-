
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Avatar, SchoolMember, SchoolRole } from '../types';
import { generatePedagogicalStory } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const SchoolRoom: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  // Data State
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [schoolRoster, setSchoolRoster] = useState<SchoolMember[]>([]);
  
  // UI State
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [lessonTheme, setLessonTheme] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Lesson Participants
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [participatingStudents, setParticipatingStudents] = useState<string[]>([]); // avatar IDs

  useEffect(() => {
    // Carregar avatares
    const savedAvatars = JSON.parse(localStorage.getItem('avatars') || '[]');
    setAvatars(savedAvatars);

    // Carregar estrutura da escola
    const savedRoster = JSON.parse(localStorage.getItem('schoolRoster') || '[]');
    setSchoolRoster(savedRoster);
  }, []);

  const saveRoster = (newRoster: SchoolMember[]) => {
    setSchoolRoster(newRoster);
    localStorage.setItem('schoolRoster', JSON.stringify(newRoster));
  };

  // --- Slot Management ---
  const handleSlotClick = (slotId: string, role: SchoolRole) => {
    setSelectedSlotId(slotId);
    setIsSelectorOpen(true);
  };

  const assignAvatarToSlot = (avatarId: string) => {
    if (!selectedSlotId) return;

    // Remove avatar if it was seated elsewhere to avoid clones (optional rule, but good for logic)
    // const cleanRoster = schoolRoster.filter(m => m.avatarId !== avatarId);
    
    // For simplicity, let's allow clones (maybe the director is also a teacher?)
    // But let's remove whatever was in THIS slot before
    const filteredRoster = schoolRoster.filter(m => m.slotId !== selectedSlotId);

    const role = getRoleFromSlotId(selectedSlotId);
    
    const newMember: SchoolMember = {
      slotId: selectedSlotId,
      avatarId,
      role
    };

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

  // --- Lesson Generation ---
  const toggleStudentParticipation = (avatarId: string) => {
    if (participatingStudents.includes(avatarId)) {
      setParticipatingStudents(prev => prev.filter(id => id !== avatarId));
    } else {
      if (participatingStudents.length >= 5) {
        alert("Máximo de 5 alunos por história para não virar bagunça!");
        return;
      }
      setParticipatingStudents(prev => [...prev, avatarId]);
    }
  };

  const handleStartLesson = async () => {
    if (!lessonTheme.trim()) {
      alert("Escreva o tema da aula na lousa!");
      return;
    }
    if (!selectedTeacherId) {
      alert("Selecione um professor para dar a aula (clique no avatar do professor).");
      return;
    }
    if (participatingStudents.length === 0) {
      alert("Selecione pelo menos um aluno para participar.");
      return;
    }

    // Regra M1/M2/Escola: Modo Escola consome crédito ou precisa de plano?
    // Vamos assumir que segue a mesma regra do StoryWizard
    if (!user) return;
    const check = authService.canCreateStory(user);
    if (!check.allowed) {
        if (confirm(`${check.reason}\n\nFazer upgrade para continuar?`)) navigate('/pricing');
        return;
    }

    setLoading(true);

    const teacherAvatar = avatars.find(a => a.id === selectedTeacherId)!;
    const studentAvatars = avatars.filter(a => participatingStudents.includes(a.id));

    try {
      const storyData = await generatePedagogicalStory(lessonTheme, teacherAvatar, studentAvatars);
      
      const fullStory = {
        id: Date.now().toString(),
        createdAt: Date.now(),
        characters: [teacherAvatar, ...studentAvatars], // Todos são personagens
        theme: `[AULA] ${lessonTheme}`,
        isPremium: check.type === 'premium',
        isEducational: true,
        ...storyData
      };

      authService.consumeStoryCredit(user.id, check.type || 'free');
      refreshUser();

      if (check.type === 'premium') {
          const existingStories = JSON.parse(localStorage.getItem('savedStories') || '[]');
          localStorage.setItem('savedStories', JSON.stringify([fullStory, ...existingStories]));
      }
      
      localStorage.setItem('currentStory', JSON.stringify(fullStory));
      navigate(`/story/${fullStory.id}`);

    } catch (e) {
      console.error(e);
      alert("Ocorreu um erro ao preparar a aula. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cartoon-blue via-blue-200 to-cartoon-green relative overflow-x-hidden">
      
      {/* Decorative Sky Elements */}
      <div className="absolute top-10 left-10 text-8xl opacity-80 animate-float">☁️</div>
      <div className="absolute top-20 right-20 text-8xl opacity-60 animate-float" style={{animationDelay: '2s'}}>☁️</div>
      <div className="absolute top-5 right-1/2 text-9xl animate-spin-slow text-cartoon-yellow origin-center">☀️</div>

      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        
        {/* HEADER & LOUSA */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
            <div>
                <h1 className="font-comic text-6xl text-white text-stroke-black drop-shadow-lg mb-2">Escola da Vida 🏫</h1>
                <p className="font-heading text-xl text-white font-bold bg-black/20 p-2 rounded-lg inline-block">
                    Ambiente de Aprendizado ao Ar Livre
                </p>
            </div>

            {/* Lousa Mágica (Input de Tema) */}
            <div className="bg-green-900 border-[6px] border-yellow-700 rounded-xl p-4 w-full md:w-96 shadow-2xl transform rotate-1">
                <div className="text-white/50 text-center font-comic mb-2 border-b border-white/20 pb-1">Lousa do Dia</div>
                <textarea 
                    value={lessonTheme}
                    onChange={(e) => setLessonTheme(e.target.value)}
                    placeholder="Tema da aula: Por que comer brócolis? O perigo de falar com estranhos..."
                    className="w-full h-24 bg-transparent text-white font-hand text-xl placeholder-white/50 outline-none resize-none"
                    style={{ fontFamily: '"Comic Neue", cursive' }}
                />
                <Button 
                    onClick={handleStartLesson}
                    loading={loading}
                    disabled={loading}
                    variant="primary" 
                    className="w-full mt-2 border-white text-white bg-green-700 hover:bg-green-600"
                >
                    {loading ? 'Preparando...' : '🔔 TOCAR O SINO (Iniciar Aula)'}
                </Button>
            </div>
        </div>

        {/* --- DIRETORIA (TOPO) --- */}
        <div className="flex justify-center gap-16 mb-16">
            <SchoolSeat 
                slotId="dir" 
                label="Diretor(a)" 
                avatar={getAvatarInSlot('dir')} 
                onClick={() => handleSlotClick('dir', 'director')}
                color="bg-purple-200"
            />
            <SchoolSeat 
                slotId="vice" 
                label="Vice-Diretor(a)" 
                avatar={getAvatarInSlot('vice')} 
                onClick={() => handleSlotClick('vice', 'vice_director')}
                color="bg-purple-100"
            />
        </div>

        {/* --- SALA DOS PROFESSORES (MEIO) --- */}
        <div className="bg-white/30 backdrop-blur-sm rounded-3xl p-6 border-4 border-white/50 mb-12">
            <h2 className="text-center font-heading text-2xl text-white text-stroke-black mb-6">Corpo Docente 🍎</h2>
            <div className="flex flex-wrap justify-center gap-6">
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
                            isSelectable={true}
                        />
                    );
                })}
            </div>
            <p className="text-center text-blue-900 font-bold mt-2 text-sm">Clique no professor para selecioná-lo para a aula</p>
        </div>

        {/* --- ALUNOS (GRAMADO) --- */}
        <div className="bg-cartoon-green/80 rounded-[50px] p-8 border-t-8 border-green-700 shadow-inner relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" 
                 style={{backgroundImage: 'radial-gradient(#2f5c2f 15%, transparent 16%)', backgroundSize: '20px 20px'}}>
            </div>
            
            <h2 className="text-center font-heading text-3xl text-white text-stroke-black mb-8 relative z-10">Turma 2024 🎒</h2>
            
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-10 gap-4 relative z-10">
                {Array.from({ length: 30 }).map((_, idx) => {
                    const num = idx + 1;
                    const slotId = `aluno_${num < 10 ? '0'+num : num}`;
                    const avatar = getAvatarInSlot(slotId);
                    const isParticipating = avatar && participatingStudents.includes(avatar.id);

                    return (
                        <div key={slotId} className="flex flex-col items-center">
                            <button
                                onClick={() => {
                                    if (!avatar) handleSlotClick(slotId, 'student');
                                    else toggleStudentParticipation(avatar.id);
                                }}
                                className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all transform hover:scale-110 shadow-lg relative
                                    ${avatar ? 'bg-white border-black' : 'bg-green-600/50 border-green-800 border-dashed'}
                                    ${isParticipating ? 'ring-4 ring-cartoon-yellow scale-110' : ''}
                                `}
                            >
                                {avatar ? (
                                    <>
                                        <img src={avatar.imageUrl} className="w-full h-full rounded-full object-cover" />
                                        {isParticipating && <div className="absolute -top-2 -right-2 text-xl">✋</div>}
                                    </>
                                ) : (
                                    <span className="text-white/50 font-comic">{num}</span>
                                )}
                            </button>
                            {avatar && (
                                <span className="bg-white px-1 rounded text-[10px] font-bold mt-1 max-w-[60px] truncate border border-black shadow-sm">
                                    {avatar.name}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

      </div>

      {/* AVATAR SELECTOR MODAL */}
      {isSelectorOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <Card color="white" className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-heading text-2xl">Quem vai sentar aqui?</h3>
                    <button onClick={() => setIsSelectorOpen(false)} className="text-2xl font-bold">✕</button>
                </div>
                
                <div className="flex-grow overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4 p-2">
                    {/* Opção Vazio/Remover */}
                    <button 
                        onClick={() => {
                            // Logic to remove... for now just assigning empty/undefined basically removes if we handle logic right, 
                            // but currently assignAvatarToSlot expects an ID. 
                            // Let's just implement assignment for now.
                            // To remove, we'd need a "Remove" button specifically.
                            alert("Para remover, substitua por outro ou limpe a escola nas configurações (feature futura).");
                        }}
                        className="border-2 border-dashed border-red-400 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-red-50"
                    >
                        <span>🚫</span>
                        <span className="text-sm font-bold text-red-500">Ninguém</span>
                    </button>

                    {avatars.map(av => (
                        <button 
                            key={av.id}
                            onClick={() => assignAvatarToSlot(av.id)}
                            className="border-2 border-black rounded-xl p-2 hover:bg-cartoon-yellow transition-colors flex flex-col items-center gap-2"
                        >
                            <img src={av.imageUrl} className="w-16 h-16 rounded-full border border-black bg-white" />
                            <span className="font-bold text-sm truncate w-full text-center">{av.name}</span>
                        </button>
                    ))}
                    
                    <button 
                         onClick={() => navigate('/avatars')}
                         className="border-2 border-dashed border-gray-400 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-gray-50 text-gray-500"
                    >
                        <span className="text-2xl">+</span>
                        <span className="text-sm font-bold">Criar Novo</span>
                    </button>
                </div>
            </Card>
        </div>
      )}

    </div>
  );
};

// Subcomponent for Director/Teacher Seats
const SchoolSeat: React.FC<{ 
    slotId: string, 
    label: string, 
    avatar?: Avatar | null, 
    onClick: () => void, 
    onEdit?: () => void,
    color: string,
    isSelected?: boolean,
    isSelectable?: boolean
}> = ({ label, avatar, onClick, onEdit, color, isSelected, isSelectable }) => (
    <div className="flex flex-col items-center group relative">
        <div className={`
            w-24 h-24 md:w-32 md:h-32 rounded-hand border-4 border-black shadow-doodle flex items-center justify-center relative overflow-hidden transition-transform cursor-pointer
            ${color} ${isSelected ? 'ring-4 ring-cartoon-pink scale-105' : 'hover:scale-105'}
        `}
        onClick={onClick}
        >
            {avatar ? (
                <img src={avatar.imageUrl} alt={avatar.name} className="w-full h-full object-cover" />
            ) : (
                <span className="text-4xl opacity-20">👤</span>
            )}
            
            {/* Edit Button (small) */}
            {avatar && onEdit && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="absolute top-1 right-1 bg-white border border-black rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-gray-200 z-10"
                    title="Trocar pessoa"
                >
                    ✏️
                </button>
            )}
        </div>
        
        <div className="bg-black text-white px-3 py-1 rounded-full text-sm font-comic mt-2 border-2 border-white shadow-sm z-10">
            {avatar ? avatar.name : label}
        </div>
        
        {/* Chair Legs Effect */}
        <div className="w-16 h-4 bg-black/20 rounded-full mt-1 blur-sm"></div>
    </div>
);

export default SchoolRoom;
