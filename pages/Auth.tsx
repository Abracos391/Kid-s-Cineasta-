
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        login(email, password);
      } else {
        if (!name) throw new Error("Nome é obrigatório");
        register(name, email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-white/50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
            <div className="w-24 h-24 bg-cartoon-yellow rounded-full border-[3px] border-black flex items-center justify-center font-comic text-black text-4xl shadow-doodle mx-auto mb-4 animate-bounce-slow">
                CK
            </div>
            <h2 className="font-comic text-5xl text-cartoon-blue text-stroke-black mb-2 drop-shadow-md">
                {isLogin ? 'Entrar' : 'Criar Conta'}
            </h2>
            <p className="font-sans font-bold text-gray-700">
                {isLogin ? 'Bem-vindo de volta ao mundo da imaginação!' : 'Junte-se a nós para criar histórias mágicas!'}
            </p>
        </div>

        <Card color="white" className="transform rotate-1">
            <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                    <div>
                        <label className="block font-bold mb-1 font-heading">Nome do Responsável</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border-4 border-black rounded-xl font-sans outline-none focus:border-cartoon-pink"
                            placeholder="Ex: Papai do João"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                )}
                
                <div>
                    <label className="block font-bold mb-1 font-heading">E-mail</label>
                    <input 
                        type="email" 
                        className="w-full p-3 border-4 border-black rounded-xl font-sans outline-none focus:border-cartoon-blue"
                        placeholder="exemplo@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block font-bold mb-1 font-heading">Senha</label>
                    <input 
                        type="password" 
                        className="w-full p-3 border-4 border-black rounded-xl font-sans outline-none focus:border-cartoon-purple"
                        placeholder="******"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>

                {error && <p className="text-red-500 font-bold text-center bg-red-100 p-2 rounded-lg border-2 border-red-500 animate-pulse">{error}</p>}

                <Button variant="primary" size="lg" className="w-full">
                    {isLogin ? '🚀 DECOLAR!' : '✨ CADASTRAR'}
                </Button>
            </form>

            <div className="mt-6 text-center border-t-2 border-gray-100 pt-4">
                <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-blue-600 font-bold hover:underline font-sans"
                >
                    {isLogin ? 'Não tem conta? Crie grátis!' : 'Já tem conta? Entre aqui.'}
                </button>
            </div>
        </Card>
        
        {!isLogin && (
            <div className="bg-yellow-100 border-2 border-black p-2 rounded-lg text-center transform -rotate-2">
                <p className="text-xs text-black font-sans font-bold">
                    🎁 Ao cadastrar, você começa no plano FREE (4 histórias/mês).
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
