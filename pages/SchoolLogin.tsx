import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

const SchoolLogin: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [name, setName] = useState(''); 
  const [schoolName, setSchoolName] = useState(''); 
  const [code, setCode] = useState(''); 
  const [whatsapp, setWhatsapp] = useState(''); 
  
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false); 
  
  // @ts-ignore
  const { loginAsTeacher, registerSchool, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user?.isSchoolUser) {
        navigate('/school');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    try {
      if (isRegistering) {
          if (!schoolName.trim()) throw new Error("O nome da escola é obrigatório.");
          if (!name.trim()) throw new Error("O nome do educador é obrigatório.");
          if (code.length < 4) throw new Error("Crie um código com pelo menos 4 caracteres.");
          if (whatsapp.length < 10) throw new Error("Informe um WhatsApp válido.");
          
          await registerSchool(schoolName, name, code, whatsapp);
      } else {
          if (!name.trim()) throw new Error("Por favor, identifique-se Professor(a).");
          await loginAsTeacher(name, code);
      }
    } catch (err: any) {
      setError(err.message || "Acesso negado.");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white font-bold">Carregando Escola...</div>;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#0f172a]">
        
        {/* Imagem de Fundo com Overlay Escuro (Estilo Tech/Escola Moderna) */}
        <div className="absolute inset-0 z-0 opacity-20" 
             style={{
                 backgroundImage: 'url("https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop")', // Fundo abstrato azul escuro
                 backgroundSize: 'cover',
                 backgroundPosition: 'center',
             }}>
        </div>
        
        {/* Overlay Gradiente para garantir legibilidade idêntica ao print */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0f172a] via-[#0f172a]/90 to-[#1e293b]"></div>

        <div className="max-w-xl w-full relative z-10 flex flex-col items-center">
            
            <div className="text-center mb-10 animate-fade-in">
                <h1 className="font-comic text-6xl md:text-7xl text-white tracking-widest italic mb-2" style={{ textShadow: '4px 4px 0 #000' }}>
                    MODO ESCOLA
                </h1>
                <h2 className="font-heading text-2xl md:text-3xl text-orange-500 font-bold mb-4 drop-shadow-md">
                    Área Restrita aos Educadores
                </h2>
            </div>

            <div className="w-full p-2">
                
                <div className="text-center text-blue-300/60 mb-6 font-heading text-sm uppercase tracking-[0.1em] font-bold">
                    SISTEMA DE GESTÃO PEDAGÓGICA - CINEASTA KIDS
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {isRegistering && (
                        <div className="animate-fade-in space-y-6">
                            <div>
                                <label className="block text-white font-bold mb-2 font-heading uppercase text-sm tracking-wider">Nome da Instituição</label>
                                <input 
                                    type="text" 
                                    className="w-full p-4 bg-blue-50/90 border-2 border-transparent rounded-sm text-gray-900 font-bold placeholder-gray-500 outline-none focus:border-green-400 focus:ring-4 focus:ring-green-400/20 transition-all"
                                    placeholder="Ex: Escola Municipal do Saber"
                                    value={schoolName}
                                    onChange={e => setSchoolName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-white font-bold mb-2 font-heading uppercase text-sm tracking-wider">WhatsApp</label>
                                <input 
                                    type="tel" 
                                    className="w-full p-4 bg-blue-50/90 border-2 border-transparent rounded-sm text-gray-900 font-bold placeholder-gray-500 outline-none focus:border-green-400 focus:ring-4 focus:ring-green-400/20 transition-all"
                                    placeholder="(00) 00000-0000"
                                    value={whatsapp}
                                    onChange={e => setWhatsapp(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-white font-bold mb-2 font-heading uppercase text-sm tracking-wider">Nome do Educador</label>
                        <input 
                            type="text" 
                            className="w-full p-4 bg-blue-50/90 border-2 border-transparent rounded-sm text-gray-900 font-bold placeholder-gray-500 outline-none focus:border-green-400 focus:ring-4 focus:ring-green-400/20 transition-all shadow-inner"
                            placeholder="Ex: professor@email.com"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-white font-bold mb-2 font-heading uppercase text-sm tracking-wider">
                            {isRegistering ? 'Criar Código de Acesso' : 'Código de Acesso Escolar'}
                        </label>
                        <input 
                            type="password" 
                            className="w-full p-4 bg-blue-50/90 border-2 border-transparent rounded-sm text-gray-900 font-bold placeholder-gray-500 outline-none focus:border-green-400 focus:ring-4 focus:ring-green-400/20 transition-all shadow-inner tracking-widest"
                            placeholder="••••••••"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                        />
                        {!isRegistering && <p className="text-xs text-blue-200 mt-2 opacity-60">Dica para teste: PROFESSOR123</p>}
                    </div>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded text-center text-sm font-bold animate-pulse">
                            🚨 {error}
                        </div>
                    )}

                    <Button variant="success" size="lg" className="w-full py-5 text-2xl shadow-lg hover:scale-[1.01] active:scale-95 transition-transform flex items-center justify-center gap-2 border-b-4 border-green-700 italic font-comic tracking-wide" loading={submitting}>
                        {isRegistering ? 'CADASTRAR ESCOLA ✨' : (
                            <>
                                ACESSAR SALA DE AULA 🎓
                            </>
                        )}
                    </Button>
                </form>

                <div className="mt-12 text-center border-t border-white/10 pt-6">
                    <button 
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError('');
                            setCode('');
                        }}
                        className="text-orange-400 hover:text-orange-300 font-bold hover:underline transition-colors font-heading tracking-wide text-lg"
                        type="button"
                    >
                        {isRegistering 
                            ? 'Já possui cadastro? Faça Login.' 
                            : 'Primeiro acesso? Cadastre sua Escola aqui.'}
                    </button>
                </div>
            </div>
            
            <Link to="/" className="mt-8 text-blue-300/40 hover:text-white font-bold text-xs transition-colors uppercase tracking-widest">
                 ← Voltar para o App Principal
            </Link>
        </div>
    </div>
  );
};

export default SchoolLogin;