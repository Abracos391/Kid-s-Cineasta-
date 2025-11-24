
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
    
    // Remove avatar se já estiver em outro lugar (opcional, mas evita duplicatas na visualização)
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
      alert("Por favor, escreva sobre o que será a aula/aventura na lousa!");
      return;
    }
    if (!selectedTeacherId) {
      alert("Selecione um professor para guiar a aventura (clique no avatar do professor).");
      return;
    }
    if (participatingStudents.length === 0) {
      alert("Selecione pelo menos um aluno para participar.");
      return;
    }

    if (!user) return;
    const check = authService.canCreateStory(user);
    if (!check.allowed) {
        if (confirm(`${check.reason}\n\nFazer upgrade para continuar o projeto pedagógico?`)) navigate('/pricing');
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
        theme: lessonTheme, // Salva o tema exato digitado na lousa
        isPremium: check.type === 'premium',
        isEducational: true,
        ...storyData
      };

      authService.consumeStoryCredit(user.id, check.type || 'free');
      refreshUser();

      // Salva no LocalStorage
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

  const suggestedThemes = [
    "Matemática: A importância de dividir",
    "Ciências: Como as plantas crescem?",
    "Ética: Por que não devemos mentir?",
    "História: Quem descobriu o Brasil?",
    "Segurança: Olhar para os dois lados da rua"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cartoon-blue via-blue-200 to-cartoon-green relative overflow-x-hidden pb-20">
      
      {/* Decorative Sky Elements */}
      <div className="absolute top-10 left-10 text-8xl opacity-80 animate-float">☁️</div>
      <div className="absolute top-20 right-20 text-8xl opacity-60 animate-float" style={{animationDelay: '2s'}}>☁️</div>
      <div className="absolute top-5 right-1/2 text-9xl animate-spin-slow text-cartoon-yellow origin-center">☀️</div>

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        
        {/* HEADER & LOUSA */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-12">
            <div>
                <h1 className="font-comic text-6xl text-white text-stroke-black drop-shadow-lg mb-2">Escola da Vida 🏫</h1>
                <p className="font-heading text-xl text-white font-bold bg-black/20 p-2 rounded-lg inline-block">
                    Crie histórias educativas, gere áudios e baixe PDFs para sua turma!
                </p>
                <div className="mt-4 flex gap-2">
                     <LinkButton to="/library" className="bg-white text-black px-4 py-2 rounded-lg font-bold border-2 border-black hover:bg-gray-100 shadow-sm">
                        📂 Ver Acervo Escolar
                    </LinkButton>
                    <LinkButton to="/" className="bg-transparent text-white underline font-bold px-4 py-2">
                        Voltar
                    </LinkButton>
                </div>
            </div>

            {/* Lousa Mágica (Input de Tema) */}
            <div className="relative group perspective-1000 w-full lg:w-[500px]">
                <div className="bg-[#1a3c28] border-[12px] border-[#8B4513] rounded-sm p-6 shadow-2xl transform rotate-1 transition-transform group-hover:rotate-0">
                    <div className="flex justify-between items-center border-b border-white/20 pb-2 mb-4">
                        <span className="text-white/70 font-comic text-lg">Lousa Criativa (Tema Livre)</span>
                        <div className="flex gap-1">
                           <div className="w-3 h-3 rounded-full bg-white opacity-50"></div>
                           <div className="w-10 h-3 rounded-sm bg-white opacity-30"></div>
                        </div>
                    </div>
                    
                    <textarea 
                        value={lessonTheme}
                        onChange={(e) => setLessonTheme(e.target.value)}
                        placeholder="Professor(a), use sua imaginação! &#10;Ex: A turma viaja para dentro de um formigueiro para aprender sobre trabalho em equipe..."
                        className="w-full h-32 bg-transparent text-white font-hand text-2xl placeholder-white/40 outline-none resize-none leading-relaxed"
                        style={{ fontFamily: '"Comic Neue", cursive' }}
                    />
                    
                    {/* Sugestões (Opcional) */}
                    <div className="flex flex-wrap gap-2 mb-4 mt-2">
                        <span className="text-white/50 text-xs w-full">Ou clique para inspirar:</span>
                        {suggestedThemes.map((theme, i) => (
                            <button 
                                key={i}
                                onClick={() => setLessonTheme(theme)}
                                className="text-xs bg-white/10 text-white border border-white/30 px-2 py-1 rounded hover:bg-white/20 transition-colors"
                            >
                                {theme.split(':')[0]}
                            </button>
                        ))}
                    </div>

                    <div className="border-t-4 border-[#5c3a21] pt-4 mt-2">
                        <div className="bg-[#a05a2c] h-3 w-full rounded-full opacity-50 mb-4 mx-auto"></div> {/* Calha de giz */}
                        <Button 
                            onClick={handleStartLesson}
                            loading={loading}
                            disabled={loading}
                            variant="primary" 
                            className="w-full border-white text-white bg-green-700 hover:bg-green-600 shadow-none text-xl py-3"
                        >
                            {loading ? 'Escrevendo a lição...' : '✨ CRIAR AULA + ÁUDIO + PDF'}
                        </Button>
                    </div>
                </div>
                
                {/* Apagador decorativo */}
                <div className="absolute -bottom-4 right-10 w-20 h-8 bg-gray-800 border-b-4 border-black rounded shadow-lg transform rotate-6">
                    <div className="w-full h-2 bg-white/20 mt-1"></div>
                </div>
            </div>
        </div>

        {/* --- DIRETORIA (TOPO) --- */}
        <div className="flex justify-center gap-16 mb-16 relative">
             <div className="absolute top-1/2 left-0 w-full h-1 bg-white/30 -z-10 border-t-2 border-dashed border-white/50"></div>
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
        <div className="bg-white/30 backdrop-blur-sm rounded-hand p-8 border-4 border-white/50 mb-12 shadow-lg">
            <div className="flex items-center justify-center gap-4 mb-6">
                 <span className="text-4xl">🍎</span>
                 <h2 className="text-center font-heading text-3xl text-white text-stroke-black">Corpo Docente</h2>
                 <span className="text-4xl">📏</span>
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
                            isSelectable={true}
                        />
                    );
                })}
            </div>
            <div className="text-center mt-6">
                 <p className="bg-white/80 inline-block px-4 py-1 rounded-full text-blue-900 font-bold border-2 border-blue-200">
                    👆 1. Selecione o professor(a) responsável pela aula
                 </p>
            </div>
        </div>

        {/* --- ALUNOS (GRAMADO) --- */}
        <div className="bg-cartoon-green/90 rounded-[50px] p-8 border-t-[10px] border-green-800 shadow-2xl relative overflow-hidden">
             {/* Textura de grama */}
            <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none" 
                 style={{backgroundImage: 'radial-gradient(#1a421a 15%, transparent 16%)', backgroundSize: '16px 16px'}}>
            </div>
            
            <div className="relative z-10 text-center mb-8">
                <h2 className="font-heading text-4xl text-white text-stroke-black inline-block transform -rotate-1">
                    Turma 2024 🎒
                </h2>
                <p className="text-white font-bold text-sm mt-1">2. Clique para selecionar os alunos participantes (Máx 5)</p>
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

      {/* AVATAR SELECTOR MODAL */}
      {isSelectorOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <Card color="white" className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b-2 border-gray-100 pb-2">
                    <h3 className="font-heading text-2xl">Chamada Escolar</h3>
                    <button onClick={() => setIsSelectorOpen(false)} className="text-2xl font-bold bg-gray-100 w-10 h-10 rounded-full hover:bg-red-100 hover:text-red-500">✕</button>
                </div>
                
                <div className="flex-grow overflow-y-auto grid grid-cols-2 sm:grid-cols-4 gap-4 p-2">
                    {avatars.length === 0 && (
                        <div className="col-span-full text-center py-8">
                            <p>Você não tem avatares.</p>
                            <LinkButton to="/avatars" className="text-blue-500 underline">Criar agora</LinkButton>
                        </div>
                    )}

                    {avatars.map(av => {
                         // Check if avatar is already seated SOMEWHERE to visually disable?
                         const isSeated = schoolRoster.some(m => m.avatarId === av.id && m.slotId !== selectedSlotId);
                         return (
                            <button 
                                key={av.id}
                                onClick={() => assignAvatarToSlot(av.id)}
                                disabled={isSeated} // Optional rule: can't be in two places
                                className={`border-2 rounded-xl p-2 transition-all flex flex-col items-center gap-2 group
                                    ${isSeated ? 'border-gray-200 opacity-50 bg-gray-50 cursor-not-allowed' : 'border-black hover:bg-cartoon-yellow cursor-pointer'}
                                `}
                            >
                                <div className="relative">
                                    <img src={av.imageUrl} className="w-16 h-16 rounded-full border border-black bg-white group-hover:scale-105 transition-transform" />
                                    {isSeated && <div className="absolute inset-0 bg-gray-500/50 rounded-full flex items-center justify-center text-xs text-white font-bold">Ocupado</div>}
                                </div>
                                <span className="font-bold text-sm truncate w-full text-center">{av.name}</span>
                            </button>
                         );
                    })}
                </div>
                <div className="p-4 bg-gray-50 border-t-2 border-gray-100 flex justify-between items-center">
                    <button 
                        onClick={() => {
                             // "Esvaziar carteira"
                             const filteredRoster = schoolRoster.filter(m => m.slotId !== selectedSlotId);
                             saveRoster(filteredRoster);
                             setIsSelectorOpen(false);
                        }}
                        className="text-red-500 font-bold text-sm hover:underline"
                    >
                        Esvaziar Lugar
                    </button>
                    <LinkButton to="/avatars" className="bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 text-sm">
                        + Criar Novo Avatar
                    </LinkButton>
                </div>
            </Card>
        </div>
      )}

    </div>
  );
};

// Helper LinkButton to avoid circular deps or complexity
const LinkButton: React.FC<any> = ({ to, children, className }) => {
    const navigate = useNavigate();
    return <button onClick={() => navigate(to)} className={className}>{children}</button>
}

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
            ${color} ${isSelected ? 'ring-4 ring-cartoon-pink scale-110 z-20' : 'hover:scale-105'}
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
                    className="absolute top-1 right-1 bg-white border border-black rounded-full w-7 h-7 flex items-center justify-center text-xs hover:bg-gray-200 z-10 shadow-sm"
                    title="Trocar pessoa"
                >
                    ✏️
                </button>
            )}

            {/* Selection Checkmark */}
            {isSelected && (
                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <span className="text-4xl drop-shadow-md">✅</span>
                </div>
            )}
        </div>
        
        <div className={`
            px-3 py-1 rounded-full text-sm font-comic mt-2 border-2 shadow-sm z-10 transition-colors
            ${isSelected ? 'bg-cartoon-pink text-white border-black font-bold' : 'bg-black text-white border-white'}
        `}>
            {avatar ? avatar.name : label}
        </div>
        
        {/* Chair Legs Effect */}
        <div className="w-16 h-4 bg-black/20 rounded-full mt-1 blur-sm"></div>
    </div>
);

export default SchoolRoom;
