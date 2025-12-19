import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Pricing: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleBuyPremium = () => {
    if (!user) return navigate('/auth');
    if (confirm("Confirmar compra: Pacote Individual (5 Histórias) por R$ 19,90?")) {
        authService.buyPack(user.id, 'premium_5');
        refreshUser();
        alert("🎉 Compra realizada! Você tem 5 créditos Premium.");
        navigate('/create-story');
    }
  };

  const handleBuyEnterprise = () => {
     if (!user) return navigate('/auth');
     if (confirm("Confirmar compra: Pacote Empresa (100 Histórias) por R$ 990,00?")) {
        authService.buyPack(user.id, 'enterprise_100');
        refreshUser();
        alert("🏢 Pacote Empresa ativado com sucesso!");
        navigate('/create-story');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-20">
      <h1 className="font-comic text-5xl text-center text-cartoon-green text-stroke-black mb-4 drop-shadow-md">
        Loja Cineasta Kids 🛒
      </h1>
      <p className="text-center font-sans text-xl text-gray-600 mb-12 font-bold">
        Escolha o pacote ideal para sua aventura!
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        
        {/* 1. PLANO FREE */}
        <PricingCard 
            title="Iniciante" 
            price="Grátis" 
            color="white"
            icon="🎁"
        >
            <ul className="space-y-3 font-sans text-sm font-bold text-gray-600 mb-6">
                <li className="flex items-center gap-2">✅ 1 História Completa (Áudio/PDF)</li>
                <li className="flex items-center gap-2">✅ 3 Histórias Simples (Texto/Avatar)</li>
                <li className="flex items-center gap-2">✅ Criação de Avatares</li>
                <li className="flex items-center gap-2 opacity-50">🔒 Sem Biblioteca na versão Simples</li>
            </ul>
            <div className="mt-auto">
                {user?.plan === 'free' ? (
                     <div className="bg-gray-100 p-2 rounded text-center text-gray-500 font-bold text-sm border-2 border-gray-200">Seu Plano Atual</div>
                ) : (
                     <div className="text-center text-gray-400 font-bold text-sm">Incluído</div>
                )}
            </div>
        </PricingCard>

        {/* 2. PLANO PREMIUM (B2C) */}
        <PricingCard 
            title="Cineasta PRO" 
            price="R$ 19,90" 
            subtitle="por pacote"
            color="yellow"
            icon="👑"
            recommended
        >
             <ul className="space-y-3 font-sans text-sm font-bold text-gray-800 mb-6">
                <li className="flex items-center gap-2">🌟 5 Histórias Completas</li>
                <li className="flex items-center gap-2">🔊 Narração de Voz Real</li>
                <li className="flex items-center gap-2">💾 Biblioteca Permanente</li>
                <li className="flex items-center gap-2">📄 Download PDF Colecionável</li>
            </ul>
            <Button onClick={handleBuyPremium} variant="primary" className="w-full text-lg shadow-sm">
                COMPRAR
            </Button>
        </PricingCard>

        {/* 3. PLANO ESCOLA (B2B) */}
        <PricingCard 
            title="Escola" 
            price="R$ 99,00" 
            subtitle="mensal / pacote"
            color="green"
            icon="🏫"
        >
             <ul className="space-y-3 font-sans text-sm font-bold text-gray-800 mb-6">
                <li className="flex items-center gap-2">🎓 10 Aulas Pedagógicas (BNCC)</li>
                <li className="flex items-center gap-2">👥 Até 40 Avatares (Alunos)</li>
                <li className="flex items-center gap-2">💾 Acervo Escolar Digital</li>
                <li className="flex items-center gap-2">📄 PDF Didático Exclusivo</li>
            </ul>
            {user?.isSchoolUser ? (
                 <div className="bg-green-100 p-2 rounded text-center text-green-800 font-bold text-sm border-2 border-green-200">Você é Educador</div>
            ) : (
                <Button onClick={() => navigate('/school-login')} variant="success" className="w-full text-lg shadow-sm">
                    ACESSAR
                </Button>
            )}
        </PricingCard>

        {/* 4. PLANO EMPRESA (B2B Bulk) */}
        <PricingCard 
            title="Empresa" 
            price="R$ 9,90" 
            subtitle="por usuário (Min. 100)"
            color="blue"
            icon="🏢"
        >
             <ul className="space-y-3 font-sans text-sm font-bold text-gray-800 mb-6">
                <li className="flex items-center gap-2">🚀 Pacote de 100 Histórias</li>
                <li className="flex items-center gap-2">💎 Custo Reduzido (Atacado)</li>
                <li className="flex items-center gap-2">🏢 Ideal para Eventos/Brindes</li>
                <li className="flex items-center gap-2">📄 Pagamento Antecipado</li>
            </ul>
             <Button onClick={handleBuyEnterprise} variant="secondary" className="w-full text-lg shadow-sm border-blue-800 text-blue-900">
                CONTRATAR
            </Button>
        </PricingCard>

      </div>
    </div>
  );
};

const PricingCard: React.FC<any> = ({ title, price, subtitle, color, icon, children, recommended }) => (
    <div className={`relative h-full transition-transform hover:scale-105 ${recommended ? 'z-10' : ''}`}>
        {recommended && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-cartoon-pink text-white px-4 py-1 rounded-full border-2 border-black font-bold text-sm shadow-doodle z-20 whitespace-nowrap">
                MAIS POPULAR
            </div>
        )}
        <Card color={color} className="h-full flex flex-col pt-8">
            <div className="text-center mb-6">
                <div className="text-4xl mb-2">{icon}</div>
                <h3 className="font-heading text-2xl mb-1">{title}</h3>
                <div className="text-3xl font-comic text-black">{price}</div>
                {subtitle && <div className="text-xs text-gray-500 font-bold">{subtitle}</div>}
            </div>
            {children}
        </Card>
    </div>
);

export default Pricing;