
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false); // Novo estado local
  
  const { login, register, user, loading } = useAuth(); 
  const navigate = useNavigate();

  // Redirecionamento Automático se já estiver logado
  useEffect(() => {
    if (!loading && user) {
        // Se for usuário de escola tentando acessar login comum, manda pra escola
        if (user.isSchoolUser) {
            navigate('/school');
        } else {
            navigate('/');
        }
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!name) throw new Error("Nome é obrigatório");
        await register(name, email, password);
      }
      // O useEffect acima vai lidar com o redirecionamento assim que o 'user' mudar
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro.");
      setSubmitting(false);
    }
  };

  if (loading) return null; 

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-white/50 relative">
      
      {/* Botão de Ajuda Flutuante */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
          <Link to="/tutorial">
             <button className="bg-cartoon-blue text-white font-comic font-bold px-4 py-2 rounded-full border-2 border-black shadow-doodle hover:scale-105 transition-transform animate-bounce-slow flex items-center gap-2">
                 <span>❓</span> Como usar o App?
             </button>
          </Link>
      </div>

      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-6 bg-cartoon-yellow rounded-full border-4 border-black flex items-center justify-center shadow-cartoon animate-bounce-slow transform -rotate-3">
                <span className="font-comic text-7xl text-cartoon-pink text-stroke-black tracking-tighter mt-2">CK</span>
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

                <Button variant="primary" size="lg" className="w-full" loading={submitting}>
                    {isLogin ? '🚀 DECOLAR!' : '✨ CADASTRAR'}
                </Button>
            </form>

            <div className="mt-6 text-center border-t-2 border-gray-100 pt-4">
                <button 
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    className="text-blue-600 font-bold hover:underline font-sans"
                    type="button"
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
