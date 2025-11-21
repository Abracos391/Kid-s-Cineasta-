
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const Pricing: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleBuy = () => {
    if (!user) return;
    
    const confirmed = confirm("Simular pagamento aprovado de R$ 19,90?");
    if (confirmed) {
        authService.buyPack(user.id);
        refreshUser();
        alert("🎉 Compra realizada com sucesso! Você ganhou 5 créditos e acesso PREMIUM.");
        navigate('/create-story');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-comic text-5xl text-center text-cartoon-green text-stroke-black mb-16 drop-shadow-md">
        Planos e Pacotes 💎
      </h1>

      <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
        
        {/* Plano Free */}
        <div className="transform -rotate-1">
            <Card color="white" className="h-full flex flex-col relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gray-200 px-4 py-1 rounded-full border-2 border-black font-bold font-comic">
                    Iniciante
                </div>
                <h2 className="font-heading text-4xl text-center mb-4 mt-4">Plano FREE</h2>
                <div className="text-center text-5xl font-comic mb-8 text-gray-400">Grátis</div>
                
                <ul className="space-y-4 font-sans font-bold text-lg flex-grow text-gray-700">
                    <li className="flex items-center gap-2">✅ 4 Histórias por mês</li>
                    <li className="flex items-center gap-2">✅ Criar Avatares</li>
                    <li className="flex items-center gap-2 opacity-50">🔒 Sem biblioteca salva</li>
                    <li className="flex items-center gap-2 opacity-50">🔒 Sem narração de voz</li>
                    <li className="flex items-center gap-2 opacity-50">🔒 Sem download PDF</li>
                </ul>

                <div className="mt-8 text-center">
                    {user?.plan === 'free' ? (
                        <div className="bg-gray-100 p-3 rounded-xl border-2 border-black font-bold">
                            Seu plano atual
                        </div>
                    ) : (
                         <div className="text-gray-400 font-bold">Incluído no Premium</div>
                    )}
                </div>
            </Card>
        </div>

        {/* Plano Premium */}
        <div className="transform rotate-1 hover:scale-105 transition-transform z-10">
            <Card color="yellow" className="h-full flex flex-col relative shadow-xl border-4 border-black">
                 <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-cartoon-pink text-white px-6 py-2 rounded-full border-2 border-black font-comic text-xl animate-pulse shadow-doodle">
                    MELHOR ESCOLHA 👑
                </div>
                <h2 className="font-heading text-4xl text-center mb-4 mt-6 text-purple-600">Cineasta PRO</h2>
                <div className="text-center mb-8">
                    <span className="text-5xl font-comic">R$ 19,90</span>
                    <span className="font-bold block text-sm mt-1">Pacote de 5 Histórias</span>
                </div>
                
                <ul className="space-y-4 font-sans font-bold text-lg flex-grow">
                    <li className="flex items-center gap-2">🌟 5 Créditos de História</li>
                    <li className="flex items-center gap-2">🔊 Narração com Voz Real</li>
                    <li className="flex items-center gap-2">💾 Salva na Biblioteca</li>
                    <li className="flex items-center gap-2">📄 Download em PDF (Em breve)</li>
                    <li className="flex items-center gap-2">🎨 Ilustrações Exclusivas</li>
                </ul>

                <div className="mt-8">
                    <Button onClick={handleBuy} variant="success" size="lg" className="w-full text-xl">
                        COMPRAR AGORA 🛒
                    </Button>
                    <p className="text-center text-xs font-bold mt-2">Pagamento único. Sem mensalidade.</p>
                </div>
            </Card>
        </div>

      </div>
    </div>
  );
};

export default Pricing;
