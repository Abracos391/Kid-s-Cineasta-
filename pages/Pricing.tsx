import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { idbService } from '../services/idbService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { 
  Heart, 
  Search, 
  Share2, 
  Award, 
  Copy, 
  Check, 
  Shield, 
  Upload, 
  Sparkles, 
  User as UserIcon, 
  Users, 
  CheckCircle,
  TrendingUp,
  School,
  Gift
} from 'lucide-react';

interface Benefactor {
  id: string;
  name: string;
  schoolName: string;
  city: string;
  state: string;
  avatarType: 'preset' | 'upload';
  avatarValue: string; // emoji or base64
  date: string;
  amount: number;
}

const PRESET_AVATARS = [
  { id: 'lion', emoji: '🦁', label: 'Leãozinho Corajoso', color: 'bg-orange-100' },
  { id: 'fox', emoji: '🦊', label: 'Raposinha Sabida', color: 'bg-amber-100' },
  { id: 'bear', emoji: '🐻', label: 'Ursinho Carinhoso', color: 'bg-amber-200' },
  { id: 'robot', emoji: '🤖', label: 'Robô Cientista', color: 'bg-blue-100' },
  { id: 'dino', emoji: '🦖', label: 'Dinossauro Explorador', color: 'bg-green-100' },
  { id: 'unicorn', emoji: '🦄', label: 'Unicórnio Mágico', color: 'bg-purple-100' },
];

const INITIAL_BENEFACTORS: Benefactor[] = [
  {
    id: 'b1',
    name: 'Família Silva',
    schoolName: 'EMEF Castro Alves',
    city: 'São Paulo',
    state: 'SP',
    avatarType: 'preset',
    avatarValue: '🦁',
    date: 'Julho de 2026',
    amount: 1.90
  },
  {
    id: 'b2',
    name: 'Família Ramos',
    schoolName: 'Colégio Santo Américo',
    city: 'Rio de Janeiro',
    state: 'RJ',
    avatarType: 'preset',
    avatarValue: '🦊',
    date: 'Julho de 2026',
    amount: 1.90
  },
  {
    id: 'b3',
    name: 'Família Oliveira',
    schoolName: 'Creche Estrela do Amanhã',
    city: 'Belo Horizonte',
    state: 'MG',
    avatarType: 'preset',
    avatarValue: '🦄',
    date: 'Julho de 2026',
    amount: 1.90
  },
  {
    id: 'b4',
    name: 'Roberto Alencar',
    schoolName: 'Escola Adventista',
    city: 'Curitiba',
    state: 'PR',
    avatarType: 'preset',
    avatarValue: '🤖',
    date: 'Julho de 2026',
    amount: 1.90
  },
  {
    id: 'b5',
    name: 'Família Medeiros',
    schoolName: 'Colégio Objetivo',
    city: 'Campinas',
    state: 'SP',
    avatarType: 'preset',
    avatarValue: '🦖',
    date: 'Junho de 2026',
    amount: 1.90
  }
];

const Pricing: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState<'shop' | 'wall'>('shop');

  // Search & Filter state for Wall
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('');

  // List of benefactors from IDB
  const [benefactors, setBenefactors] = useState<Benefactor[]>([]);

  // Checkout modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);
  const [buyType, setBuyType] = useState<'single_only' | 'single_with_donation' | 'donation_only'>('single_with_donation');

  // Checkout Form values
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [schoolState, setSchoolState] = useState('SP');
  const [muralIdentityType, setMuralIdentityType] = useState<'surname' | 'full' | 'anonymous'>('surname');
  const [muralName, setMuralName] = useState(user?.name || '');
  const [muralSurname, setMuralSurname] = useState('');
  const [avatarType, setAvatarType] = useState<'preset' | 'upload'>('preset');
  const [selectedPresetAvatar, setSelectedPresetAvatar] = useState('lion');
  const [uploadedPhotoBase64, setUploadedPhotoBase64] = useState<string | null>(null);

  // Simulated Payment states
  const [isCopyingPix, setIsCopyingPix] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load Benefactors list on mount
  useEffect(() => {
    const loadBenefactors = async () => {
      try {
        const stored = await idbService.get('school_data', 'benefactors_list');
        if (stored && stored.list) {
          setBenefactors(stored.list);
        } else {
          // Initialize with defaults
          await idbService.add('school_data', { id: 'benefactors_list', list: INITIAL_BENEFACTORS });
          setBenefactors(INITIAL_BENEFACTORS);
        }
      } catch (err) {
        console.error("Erro ao carregar mural:", err);
        setBenefactors(INITIAL_BENEFACTORS);
      }
    };
    loadBenefactors();
  }, [activeTab]);

  // Handle Photo upload conversion to base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Open Checkout Modal
  const openCheckout = (type: 'single_only' | 'single_with_donation' | 'donation_only') => {
    if (!user) {
      alert("Por favor, faça login ou cadastre-se para prosseguir com a compra.");
      return navigate('/auth');
    }
    setBuyType(type);
    setSchoolName('');
    setSchoolCity('');
    setSchoolState('SP');
    setMuralIdentityType('surname');
    setMuralName(user.name || '');
    setMuralSurname('');
    setAvatarType('preset');
    setSelectedPresetAvatar('lion');
    setUploadedPhotoBase64(null);
    setCheckoutStep(type === 'single_only' ? 2 : 1); // Skip step 1 if buying without donation
    setIsCheckoutOpen(true);
  };

  // Copy Pix Key Simulation
  const handleCopyPixKey = () => {
    const pixKey = "00020126580014BR.GOV.BCB.PIX0136pix@cineastakids.com.br52040000530398654044.905802BR5917CineastaKidsLtda6009Sao Paulo62070503***63041A2D";
    navigator.clipboard.writeText(pixKey);
    setIsCopyingPix(true);
    setTimeout(() => setIsCopyingPix(false), 2000);
  };

  // Process and finalize payment
  const handleConfirmPayment = async () => {
    setIsPaying(true);
    
    // Simulate API delay
    setTimeout(async () => {
      try {
        // 1. Update user credits/plan in IndexedDB
        if (buyType !== 'donation_only') {
          await authService.buyPack(user!.id, buyType === 'single_only' ? 'single_story' : 'single_story_donation');
        }

        // 2. Add benefactor if donated
        if (buyType === 'single_with_donation' || buyType === 'donation_only') {
          let displayName = 'Doador Anônimo';
          if (muralIdentityType === 'surname') {
            displayName = muralSurname ? `Família ${muralSurname}` : 'Família de Benfeitores';
          } else if (muralIdentityType === 'full') {
            displayName = `${muralName} ${muralSurname}`.trim();
          }

          const chosenAvatar = PRESET_AVATARS.find(a => a.id === selectedPresetAvatar);
          const avatarVal = avatarType === 'preset' ? (chosenAvatar?.emoji || '🦁') : (uploadedPhotoBase64 || '🦁');

          const newBenefactor: Benefactor = {
            id: `b_user_${Date.now()}`,
            name: displayName,
            schoolName: schoolName || 'Escola do Município',
            city: schoolCity || 'Cidade Padrão',
            state: schoolState,
            avatarType: avatarType,
            avatarValue: avatarVal,
            date: 'Julho de 2026',
            amount: 1.90
          };

          // Update DB
          const currentList = [...benefactors];
          currentList.unshift(newBenefactor); // Add to top/start of list
          await idbService.add('school_data', { id: 'benefactors_list', list: currentList });
          setBenefactors(currentList);
        }

        await refreshUser();
        setCheckoutStep(3); // Success Screen
      } catch (e) {
        console.error("Erro ao salvar dados de compra:", e);
        alert("Ocorreu um erro ao salvar sua compra. Por favor, tente novamente.");
      } finally {
        setIsPaying(false);
      }
    }, 1500);
  };

  // Simple share simulation
  const handleShareOnWall = (benefactorName: string, school: string) => {
    const text = `🎖️ Fui incluído no Hall de Benfeitores do Ensino do Cineasta Kids por doar uma história licenciada para a escola "${school}"! Apoie você também por apenas R$ 1,90! 📚❤️`;
    navigator.clipboard.writeText(text);
    alert("Mensagem de compartilhamento copiada para a área de transferência! Compartilhe no seu WhatsApp ou redes sociais! 🚀");
  };

  // Calculations for Stats
  const totalSchools = Array.from(new Set(benefactors.map(b => b.schoolName.toLowerCase()))).length;
  const totalDonations = benefactors.length;

  // Filtered benefactors
  const filteredBenefactors = benefactors.filter(b => {
    const query = searchTerm.toLowerCase();
    const matchSearch = b.name.toLowerCase().includes(query) || 
                        b.schoolName.toLowerCase().includes(query) || 
                        b.city.toLowerCase().includes(query);
    const matchState = filterState ? b.state === filterState : true;
    return matchSearch && matchState;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-20 font-comic">
      {/* Title */}
      <h1 className="font-comic text-5xl md:text-6xl text-center text-cartoon-green text-stroke-black mb-4 drop-shadow-md">
        Cineasta Kids Loja 🛒
      </h1>
      <p className="text-center font-sans text-xl text-gray-700 mb-8 font-bold">
        Crie histórias inesquecíveis e ajude a espalhar a literatura infantil nas escolas!
      </p>

      {/* Tabs */}
      <div className="flex justify-center gap-4 mb-12">
        <button
          onClick={() => setActiveTab('shop')}
          className={`px-6 py-3 rounded-hand border-[3px] border-black text-xl font-bold transition-all transform hover:-rotate-1 shadow-doodle ${
            activeTab === 'shop' 
              ? 'bg-cartoon-yellow text-black scale-105' 
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          🛒 Loja & Planos
        </button>
        <button
          onClick={() => setActiveTab('wall')}
          className={`px-6 py-3 rounded-hand border-[3px] border-black text-xl font-bold transition-all transform hover:rotate-1 shadow-doodle ${
            activeTab === 'wall' 
              ? 'bg-cartoon-pink text-white scale-105' 
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          🎖️ Mural de Benfeitores
        </button>
      </div>

      {/* TAB 1: SHOP & PLANS */}
      {activeTab === 'shop' && (
        <div className="space-y-12">
          
          {/* SPECIAL HERO PLAN: SINGLE STORY + DONATION */}
          <div className="max-w-4xl mx-auto">
            <div className="relative border-[4px] border-black bg-gradient-to-r from-yellow-100 via-pink-100 to-blue-100 rounded-hand p-8 md:p-12 shadow-cartoon transform hover:rotate-0.5 transition-transform">
              {/* Badge */}
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-cartoon-pink text-white px-6 py-2 rounded-full border-3 border-black font-bold text-lg shadow-doodle whitespace-nowrap z-20 flex items-center gap-2">
                <Sparkles className="w-5 h-5 animate-pulse" /> RECOMENDADO PARA PAIS
              </div>

              <div className="grid md:grid-cols-5 gap-8 items-center mt-4">
                <div className="md:col-span-3 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-4xl">📚</span>
                    <h2 className="text-3xl md:text-4xl font-black text-black tracking-tight">
                      Cineasta Kids avulso
                    </h2>
                  </div>
                  <p className="font-sans font-bold text-gray-700 text-lg leading-relaxed">
                    Faça a história completa do seu filho com avatar personalizado, narrativa exclusiva da IA, imagens fantásticas para cada um dos 4 capítulos e áudio narrado por voz real.
                  </p>

                  <div className="bg-white/80 border-2 border-black rounded-xl p-4 font-sans text-sm space-y-3 shadow-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-gray-900">História Completa do Seu Filho (R$ 4,90):</span>
                        <p className="text-gray-600">4 capítulos de texto, 4 ilustrações personalizadas e áudio com voz real emocionante.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2 border-t border-gray-200 pt-3">
                      <Heart className="w-5 h-5 text-cartoon-pink fill-cartoon-pink shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <span className="font-bold text-gray-900">Doação Solidária à Escola (+ R$ 1,90):</span>
                        <p className="text-gray-600">Doe uma versão educacional da história do seu filho para a sala de aula dele. Sua foto ou nome da família brilha no nosso Mural de Benfeitores do Ensino!</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-col items-center bg-white border-[3px] border-black p-6 rounded-hand-2 shadow-doodle relative">
                  <span className="text-gray-500 font-bold text-sm tracking-widest uppercase">História Individual</span>
                  <div className="text-5xl font-black text-black my-2">R$ 4,90</div>
                  <span className="text-xs text-gray-500 font-bold text-center mb-4">Sem doação à escola</span>
                  
                  <Button 
                    onClick={() => openCheckout('single_only')} 
                    variant="secondary" 
                    className="w-full text-lg mb-3 py-1.5 border-black text-black"
                  >
                    COMPRAR HISTÓRIA
                  </Button>

                  <div className="w-full border-t-2 border-dashed border-gray-300 my-2"></div>

                  <span className="text-cartoon-pink font-black text-xs tracking-widest uppercase mt-2 flex items-center gap-1 animate-bounce">
                    <Award className="w-4 h-4" /> RECOMENDADO
                  </span>
                  <div className="text-4xl font-black text-cartoon-pink my-1">R$ 6,80</div>
                  <span className="text-[10px] text-gray-600 font-bold text-center mb-4">Com doação à escola (R$ 4,90 + R$ 1,90)</span>

                  <Button 
                    onClick={() => openCheckout('single_with_donation')} 
                    variant="primary" 
                    className="w-full text-xl py-2 shadow-doodle"
                    pulse
                  >
                    CRIAR & DOAR ❤️
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* STANDARD PACKAGES */}
          <div>
            <h3 className="text-3xl text-center text-stroke-black mb-8">Outros Pacotes Cineasta</h3>
            
            <div className="grid md:grid-cols-3 gap-6 items-start max-w-6xl mx-auto">
              
              {/* PLAN 1: CINEMATE PRO */}
              <Card color="yellow" className="h-full flex flex-col pt-8">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">👑</div>
                  <h3 className="font-heading text-2xl mb-1">Cineasta PRO</h3>
                  <div className="text-3xl font-comic text-black">R$ 19,90</div>
                  <div className="text-xs text-gray-500 font-bold">Pacote com 5 histórias</div>
                </div>
                <ul className="space-y-3 font-sans text-sm font-bold text-gray-800 mb-6 flex-grow">
                  <li className="flex items-center gap-2">🌟 5 Histórias Completas</li>
                  <li className="flex items-center gap-2">🔊 Narração de Voz Real emocionante</li>
                  <li className="flex items-center gap-2">💾 Biblioteca permanente no painel</li>
                  <li className="flex items-center gap-2">📄 Download do PDF Colecionável</li>
                </ul>
                <Button onClick={() => openCheckout('single_only')} variant="primary" className="w-full text-lg shadow-sm">
                  CONTRATAR PRO
                </Button>
              </Card>

              {/* PLAN 2: SCHOOL AREA */}
              <Card color="green" className="h-full flex flex-col pt-8">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">🏫</div>
                  <h3 className="font-heading text-2xl mb-1">Educador & Escola</h3>
                  <div className="text-3xl font-comic text-black">R$ 99,00</div>
                  <div className="text-xs text-gray-500 font-bold">mensal / pacote</div>
                </div>
                <ul className="space-y-3 font-sans text-sm font-bold text-gray-800 mb-6 flex-grow">
                  <li className="flex items-center gap-2">🎓 10 Aulas Pedagógicas alinhadas à BNCC</li>
                  <li className="flex items-center gap-2">👥 Criação de até 40 Avatares (Alunos)</li>
                  <li className="flex items-center gap-2">💾 Biblioteca da escola digital compartilhada</li>
                  <li className="flex items-center gap-2">📄 Cadernos pedagógicos didáticos exclusivos</li>
                </ul>
                <Button onClick={() => navigate('/school-login')} variant="success" className="w-full text-lg shadow-sm">
                  ACESSAR SALA
                </Button>
              </Card>

              {/* PLAN 3: DIRECT DONATION */}
              <Card color="blue" className="h-full flex flex-col pt-8">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">🎁</div>
                  <h3 className="font-heading text-2xl mb-1">Apenas Doar Escola</h3>
                  <div className="text-3xl font-comic text-black">R$ 1,90</div>
                  <div className="text-xs text-gray-500 font-bold">Doação direta de uma história</div>
                </div>
                <p className="font-sans text-sm text-gray-700 text-center mb-6 font-medium leading-relaxed">
                  Não quer criar uma história agora, mas deseja doar um livro infantil personalizado para a escola do seu filho? Apoie de forma rápida e ganhe reconhecimento no mural!
                </p>
                <Button onClick={() => openCheckout('donation_only')} variant="secondary" className="w-full text-lg shadow-sm mt-auto text-black border-black">
                  DOAR HISTÓRIA
                </Button>
              </Card>

            </div>
          </div>

          {/* SAFETY ASSURANCE */}
          <div className="bg-gray-50 border-2 border-black rounded-xl p-6 max-w-3xl mx-auto flex gap-4 items-center font-sans">
            <Shield className="w-12 h-12 text-cartoon-green shrink-0" />
            <div>
              <h4 className="font-bold text-gray-900 text-lg mb-1">Sua segurança e privacidade de dados em primeiro lugar</h4>
              <p className="text-gray-600 text-sm">
                No Cineasta Kids, respeitamos os pais e suas famílias. Você tem controle total sobre quais dados (fotos, sobrenomes ou apenas avatares) serão exibidos no Mural de Benfeitores. Escolha o nível de privacidade que o faz se sentir confortável.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WALL OF BENEFACTORS */}
      {activeTab === 'wall' && (
        <div className="space-y-8">
          
          {/* STATS HEADER */}
          <div className="bg-cartoon-blue/10 border-[3px] border-black rounded-hand p-6 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center">
              <Award className="w-8 h-8 text-cartoon-pink mb-1" />
              <span className="text-3xl font-black text-black">{totalDonations}</span>
              <span className="text-xs text-gray-600 font-sans font-bold">Histórias Doadas</span>
            </div>
            <div className="flex flex-col items-center">
              <School className="w-8 h-8 text-cartoon-green mb-1" />
              <span className="text-3xl font-black text-black">{totalSchools}</span>
              <span className="text-xs text-gray-600 font-sans font-bold">Escolas Ajudadas</span>
            </div>
            <div className="col-span-2 md:col-span-1 flex flex-col items-center justify-center">
              <div className="bg-cartoon-yellow px-4 py-1.5 rounded-full border-2 border-black text-xs font-bold shadow-sm">
                Meta: 100 Histórias!
              </div>
            </div>
          </div>

          {/* SEARCH & FILTERS */}
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Busque por sobrenome de família, escola, cidade..."
                className="w-full bg-white border-[3px] border-black rounded-hand px-12 py-3 font-sans font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-cartoon-pink"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>

            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="bg-white border-[3px] border-black rounded-hand px-6 py-3 font-sans font-bold shadow-sm cursor-pointer"
            >
              <option value="">Todos os Estados</option>
              <option value="SP">São Paulo (SP)</option>
              <option value="RJ">Rio de Janeiro (RJ)</option>
              <option value="MG">Minas Gerais (MG)</option>
              <option value="PR">Paraná (PR)</option>
              <option value="RS">Rio Grande do Sul (RS)</option>
              <option value="SC">Santa Catarina (SC)</option>
            </select>
          </div>

          {/* BENEFACTORS GRID */}
          <div className="max-w-6xl mx-auto grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredBenefactors.length > 0 ? (
              filteredBenefactors.map((b) => (
                <div key={b.id} className="transform hover:-translate-y-1 transition-transform">
                  <div className="bg-white border-[3px] border-black rounded-hand p-6 shadow-doodle flex flex-col items-center relative overflow-hidden h-full">
                    {/* Corner Ribbon */}
                    <div className="absolute -top-1 -right-1 bg-cartoon-yellow text-black border-l-2 border-b-2 border-black px-3 py-1 font-sans text-[10px] font-black uppercase tracking-wider">
                      Benfeitor
                    </div>

                    {/* Avatar representation */}
                    <div className="w-24 h-24 rounded-full border-[3px] border-black flex items-center justify-center bg-gray-100 shadow-sm overflow-hidden mb-4 mt-2">
                      {b.avatarType === 'preset' ? (
                        <span className="text-5xl">{b.avatarValue}</span>
                      ) : (
                        <img 
                          src={b.avatarValue} 
                          alt="Foto Benfeitor" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>

                    {/* Name */}
                    <h4 className="text-xl font-bold text-center text-gray-900 mb-1">{b.name}</h4>
                    
                    {/* Badge */}
                    <span className="inline-flex items-center gap-1 bg-cartoon-pink/10 border border-cartoon-pink text-cartoon-pink px-2.5 py-0.5 rounded-full text-xs font-bold mb-3">
                      <Award className="w-3.5 h-3.5 fill-cartoon-pink" /> Benfeitor do Ensino
                    </span>

                    {/* School aided details */}
                    <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-sans text-xs space-y-1 text-center mt-auto">
                      <p className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Ajudou a escola:</p>
                      <p className="text-gray-800 font-extrabold text-sm">{b.schoolName}</p>
                      <p className="text-gray-500 font-medium">{b.city} - {b.state}</p>
                    </div>

                    {/* Footer Date / Share */}
                    <div className="w-full flex items-center justify-between border-t border-gray-100 pt-3 mt-4 text-xs font-sans text-gray-400">
                      <span>{b.date}</span>
                      <button 
                        onClick={() => handleShareOnWall(b.name, b.schoolName)}
                        className="flex items-center gap-1 hover:text-cartoon-pink font-bold transition-colors cursor-pointer"
                        title="Compartilhar"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Compartilhar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center">
                <span className="text-5xl mb-4 block">👀</span>
                <p className="text-xl font-sans text-gray-500 font-bold">Nenhum benfeitor encontrado com estes filtros.</p>
                <p className="text-sm text-gray-400 font-sans mt-1">Experimente buscar por outros termos ou estados.</p>
              </div>
            )}
          </div>

          {/* CALL TO ACTION */}
          <div className="max-w-xl mx-auto text-center pt-8">
            <h4 className="text-2xl text-stroke-black mb-3">Seu nome merece estar aqui!</h4>
            <p className="font-sans text-gray-600 text-sm mb-4 font-medium">
              Por apenas R$ 1,90 você ajuda o Cineasta Kids a doar novas histórias infantis de alta qualidade para as escolas locais e apoia o aprendizado.
            </p>
            <Button onClick={() => openCheckout('donation_only')} variant="primary" className="text-lg py-1.5 shadow-doodle">
              QUERO ME JUNTAR AO MURAL
            </Button>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL FLOW */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-[4px] border-black rounded-hand max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-cartoon relative animate-fade-in">
            
            {/* Close Button */}
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-4 right-4 bg-cartoon-orange text-white border-2 border-black w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg hover:scale-110 active:scale-95 transition-all"
            >
              ✕
            </button>

            {/* STEP 1: MURAL CUSTOMIZATION */}
            {checkoutStep === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <span className="text-3xl">🎖️</span>
                  <h3 className="text-2xl text-stroke-black mt-1">Seu lugar no Mural!</h3>
                  <p className="font-sans text-xs text-gray-500 font-bold">Preencha os dados da escola e sua identidade no mural</p>
                </div>

                <div className="space-y-4 font-sans text-sm">
                  {/* School details */}
                  <div className="space-y-2">
                    <label className="block font-bold text-gray-800">🏫 Nome da Escola do seu Filho:</label>
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="Ex: EMEF Castro Alves"
                      required
                      className="w-full bg-white border-2 border-black rounded-xl px-4 py-2 font-semibold text-gray-800 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <label className="block font-bold text-gray-800 text-xs">Cidade da Escola:</label>
                      <input
                        type="text"
                        value={schoolCity}
                        onChange={(e) => setSchoolCity(e.target.value)}
                        placeholder="Ex: São Paulo"
                        required
                        className="w-full bg-white border-2 border-black rounded-xl px-3 py-1.5 font-semibold text-gray-800 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="block font-bold text-gray-800 text-xs">Estado:</label>
                      <select
                        value={schoolState}
                        onChange={(e) => setSchoolState(e.target.value)}
                        className="w-full bg-white border-2 border-black rounded-xl px-2 py-1.5 font-semibold text-gray-800 focus:outline-none"
                      >
                        <option value="SP">SP</option>
                        <option value="RJ">RJ</option>
                        <option value="MG">MG</option>
                        <option value="PR">PR</option>
                        <option value="SC">SC</option>
                        <option value="RS">RS</option>
                        <option value="DF">DF</option>
                        <option value="BA">BA</option>
                        <option value="PE">PE</option>
                        <option value="CE">CE</option>
                      </select>
                    </div>
                  </div>

                  {/* Privacy / Identity details */}
                  <div className="border-t-2 border-dashed border-gray-200 pt-4 space-y-3">
                    <label className="block font-bold text-gray-800">🔒 Como prefere ser identificado no mural?</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setMuralIdentityType('surname')}
                        className={`py-2 px-1 text-xs border-2 rounded-xl font-bold transition-all ${
                          muralIdentityType === 'surname' ? 'bg-cartoon-yellow border-black' : 'bg-gray-100 border-transparent text-gray-600'
                        }`}
                      >
                        Sobrenome Família
                      </button>
                      <button
                        type="button"
                        onClick={() => setMuralIdentityType('full')}
                        className={`py-2 px-1 text-xs border-2 rounded-xl font-bold transition-all ${
                          muralIdentityType === 'full' ? 'bg-cartoon-yellow border-black' : 'bg-gray-100 border-transparent text-gray-600'
                        }`}
                      >
                        Nome Completo
                      </button>
                      <button
                        type="button"
                        onClick={() => setMuralIdentityType('anonymous')}
                        className={`py-2 px-1 text-xs border-2 rounded-xl font-bold transition-all ${
                          muralIdentityType === 'anonymous' ? 'bg-cartoon-yellow border-black' : 'bg-gray-100 border-transparent text-gray-600'
                        }`}
                      >
                        Manter Anônimo
                      </button>
                    </div>

                    {muralIdentityType !== 'anonymous' && (
                      <div className="grid grid-cols-2 gap-3 animate-fade-in">
                        {muralIdentityType === 'full' && (
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-gray-700">Seu Nome:</span>
                            <input
                              type="text"
                              value={muralName}
                              onChange={(e) => setMuralName(e.target.value)}
                              placeholder="Nome"
                              className="w-full bg-white border-2 border-black rounded-xl px-3 py-1 text-sm font-semibold"
                            />
                          </div>
                        )}
                        <div className="space-y-1 col-span-1">
                          <span className="text-xs font-bold text-gray-700">
                            {muralIdentityType === 'surname' ? 'Sobrenome da Família:' : 'Seu Sobrenome:'}
                          </span>
                          <input
                            type="text"
                            value={muralSurname}
                            onChange={(e) => setMuralSurname(e.target.value)}
                            placeholder="Ex: Silva"
                            className="w-full bg-white border-2 border-black rounded-xl px-3 py-1 text-sm font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Photo / Avatar selector */}
                  <div className="border-t-2 border-dashed border-gray-200 pt-4 space-y-3">
                    <label className="block font-bold text-gray-800">📸 Foto ou Avatar fofo no mural?</label>
                    <div className="flex gap-4 mb-2">
                      <label className="flex items-center gap-2 font-bold text-gray-700 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="avatar_choice"
                          checked={avatarType === 'preset'}
                          onChange={() => setAvatarType('preset')}
                          className="accent-cartoon-pink w-4 h-4"
                        />
                        <span>Usar Avatar Divertido</span>
                      </label>
                      <label className="flex items-center gap-2 font-bold text-gray-700 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="avatar_choice"
                          checked={avatarType === 'upload'}
                          onChange={() => setAvatarType('upload')}
                          className="accent-cartoon-pink w-4 h-4"
                        />
                        <span>Upload de Foto Real</span>
                      </label>
                    </div>

                    {avatarType === 'preset' ? (
                      <div className="grid grid-cols-6 gap-2 bg-gray-50 border border-gray-200 p-3 rounded-xl animate-fade-in">
                        {PRESET_AVATARS.map((av) => (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setSelectedPresetAvatar(av.id)}
                            className={`w-11 h-11 rounded-full border-2 text-2xl flex items-center justify-center transition-transform hover:scale-110 ${av.color} ${
                              selectedPresetAvatar === av.id ? 'border-black ring-2 ring-cartoon-pink' : 'border-transparent opacity-60'
                            }`}
                            title={av.label}
                          >
                            {av.emoji}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2 bg-gray-50 border border-gray-200 p-4 rounded-xl animate-fade-in flex flex-col items-center">
                        {uploadedPhotoBase64 ? (
                          <div className="relative w-16 h-16 rounded-full border-[3px] border-black overflow-hidden mb-2">
                            <img src={uploadedPhotoBase64} alt="Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setUploadedPhotoBase64(null)}
                              className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black rounded-full p-0.5"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <Upload className="w-8 h-8 text-gray-400 mb-1" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-2 file:border-black file:text-xs file:font-bold file:bg-cartoon-yellow file:cursor-pointer"
                        />
                        <span className="text-[10px] text-gray-400 text-center">Protegemos seus dados. Essa imagem será armazenada de forma segura apenas para visualização no mural.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={() => {
                      if (!schoolName && buyType !== 'single_only') {
                        alert("Por favor, informe o nome da escola do seu filho.");
                        return;
                      }
                      setCheckoutStep(2);
                    }}
                    variant="primary"
                    className="text-lg py-1.5 px-6 shadow-sm"
                  >
                    PROSSEGUIR PARA PAGAMENTO ➔
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: PIX PAYMENT */}
            {checkoutStep === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <span className="text-3xl">📲</span>
                  <h3 className="text-2xl text-stroke-black mt-1">Pagamento via Pix</h3>
                  <p className="font-sans text-xs text-gray-500 font-bold">Leia o QR Code do Pix para finalizar</p>
                </div>

                {/* Bill details */}
                <div className="bg-gray-50 border-[2px] border-black p-4 rounded-xl font-sans text-sm space-y-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-600">
                      {buyType === 'donation_only' ? 'Doação Escola de História' : 'Criação de História Individual'}
                    </span>
                    <span className="text-gray-900 font-bold">
                      {buyType === 'donation_only' ? 'R$ 1,90' : 'R$ 4,90'}
                    </span>
                  </div>
                  {(buyType === 'single_with_donation') && (
                    <div className="flex justify-between font-medium border-b border-gray-200 pb-2">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-cartoon-pink fill-cartoon-pink" /> Doação p/ Escola ({schoolName})
                      </span>
                      <span className="text-gray-900 font-bold">R$ 1,90</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-base pt-1">
                    <span>Total a Pagar:</span>
                    <span className="text-cartoon-pink text-xl">
                      {buyType === 'single_only' ? 'R$ 4,90' : buyType === 'donation_only' ? 'R$ 1,90' : 'R$ 6,80'}
                    </span>
                  </div>
                </div>

                {/* Simulated QR Code */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-3 bg-white border-[3px] border-black rounded-hand-2 shadow-sm">
                    {/* Simulated visual QR Code using styled HTML block */}
                    <div className="w-40 h-40 border-[2px] border-black flex flex-wrap p-1 gap-1 bg-white relative">
                      {/* Corner squares */}
                      <div className="absolute top-1 left-1 w-10 h-10 border-[3px] border-black bg-transparent flex items-center justify-center">
                        <div className="w-4 h-4 bg-black"></div>
                      </div>
                      <div className="absolute top-1 right-1 w-10 h-10 border-[3px] border-black bg-transparent flex items-center justify-center">
                        <div className="w-4 h-4 bg-black"></div>
                      </div>
                      <div className="absolute bottom-1 left-1 w-10 h-10 border-[3px] border-black bg-transparent flex items-center justify-center">
                        <div className="w-4 h-4 bg-black"></div>
                      </div>
                      {/* Inner random pixels */}
                      <div className="w-full h-full opacity-70 grid grid-cols-10 grid-rows-10">
                        {Array.from({ length: 100 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-full h-full ${
                              (i % 3 === 0 || i % 7 === 0 || i % 13 === 0) && i > 30 && i < 80 ? 'bg-black' : 'bg-transparent'
                            }`}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Copy Paste key */}
                  <div className="w-full space-y-1.5 font-sans">
                    <span className="block text-xs font-bold text-gray-500 text-center">Chave Pix Copia e Cola:</span>
                    <div className="flex border-[2px] border-black rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="px-4 py-2 text-xs text-gray-500 truncate select-all font-mono flex-grow">
                        00020126580014BR.GOV.BCB.PIX0136pix@cineastakids.com.br520400005303...
                      </div>
                      <button
                        onClick={handleCopyPixKey}
                        className="bg-cartoon-yellow px-4 border-l-2 border-black font-bold text-xs hover:bg-yellow-400 flex items-center gap-1 active:translate-y-0 text-black cursor-pointer"
                      >
                        {isCopyingPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{isCopyingPix ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="pt-4 flex justify-between gap-4">
                  {buyType !== 'single_only' && (
                    <button
                      onClick={() => setCheckoutStep(1)}
                      className="px-4 py-2 border-2 border-black rounded-xl font-bold font-sans text-sm text-gray-600 hover:bg-gray-100"
                    >
                      ⬅ Voltar
                    </button>
                  )}
                  <Button
                    onClick={handleConfirmPayment}
                    variant="success"
                    loading={isPaying}
                    className="flex-grow text-xl py-2 shadow-doodle"
                    pulse
                  >
                    🚀 CONFIRMAR PAGAMENTO PIX
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: SUCCESS SCREEN */}
            {checkoutStep === 3 && (
              <div className="text-center space-y-6 py-6 animate-scale-up">
                {/* Simulated Confetti visual element */}
                <div className="relative h-20 w-full flex items-center justify-center overflow-hidden">
                  <span className="text-6xl animate-bounce">🎉</span>
                  <span className="absolute text-xl top-0 left-10 rotate-12 animate-pulse">✨</span>
                  <span className="absolute text-xl top-10 right-10 -rotate-12 animate-pulse">⭐</span>
                  <span className="absolute text-2xl bottom-0 left-1/4 animate-bounce">🎈</span>
                  <span className="absolute text-2xl bottom-2 right-1/4 animate-bounce">🎁</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-3xl text-stroke-black">Pagamento Confirmado!</h3>
                  <p className="font-sans text-cartoon-green font-black text-lg">Seu crédito foi ativado com sucesso!</p>
                </div>

                <p className="font-sans text-gray-600 text-sm max-w-sm mx-auto leading-relaxed">
                  {buyType === 'donation_only' 
                    ? `Obrigado por apoiar a escola ${schoolName}! Sua doação foi adicionada com sucesso ao nosso Hall de Benfeitores.`
                    : `Sua nova história já está liberada! Clique no botão de criação para inventar uma jornada inesquecível do seu pequeno cineasta.`
                  }
                </p>

                {buyType !== 'single_only' && (
                  <div className="bg-cartoon-pink/5 border-2 border-dashed border-cartoon-pink p-4 rounded-xl font-sans text-xs space-y-2 max-w-md mx-auto">
                    <span className="font-extrabold text-cartoon-pink text-sm block">🎖️ Certificado de Benfeitor Gerado!</span>
                    <p className="text-gray-500 leading-relaxed">
                      Sua ajuda foi registrada e você entrou para a nossa biblioteca solidária escolar. Compartilhe o link do Cineasta Kids com a coordenação da escola do seu filho para dar-lhes acesso gratuito!
                    </p>
                    <div className="flex border border-gray-200 bg-white rounded-lg p-2 items-center justify-between">
                      <span className="text-gray-400 select-all font-mono truncate mr-2 flex-grow text-left">
                        https://cineastakids.com.br/#/school?ref={user?.id || 'donation'}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://cineastakids.com.br/#/school?ref=${user?.id || 'donation'}`);
                          alert("Link escolar copiado!");
                        }}
                        className="bg-cartoon-pink text-white px-3 py-1 rounded font-bold text-[10px] hover:bg-pink-400"
                      >
                        Copiar Link
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  {buyType !== 'single_only' && (
                    <button
                      onClick={() => {
                        setIsCheckoutOpen(false);
                        setActiveTab('wall');
                      }}
                      className="px-6 py-2.5 border-2 border-black rounded-hand font-bold text-sm hover:bg-gray-50"
                    >
                      👀 Ver no Mural
                    </button>
                  )}
                  <Button
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      if (buyType === 'donation_only') {
                        setActiveTab('wall');
                      } else {
                        navigate('/create-story');
                      }
                    }}
                    variant="primary"
                    className="px-8 text-lg py-2 shadow-sm"
                  >
                    {buyType === 'donation_only' ? 'CONCLUIR' : '🚀 INICIAR HISTÓRIA!'}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;
