import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

const { useNavigate, Link } = ReactRouterDOM;

const SchoolLogin: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [name, setName] = useState(''); 
  const [schoolName, setSchoolName] = useState(''); 
  const [code, setCode] = useState(''); 
  const [whatsapp, setWhatsapp] = useState(''); // Novo Campo
  
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

  if (loading) return <div className="min-h-screen bg-[#1a3c28] flex items-center justify-center text-white font-bold">Carregando Escola...</div>;

  return (
    <div className="min-h-screen bg-[#1a3c28] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
        
        <div className="max-w-md w-full relative z-10">
            <div className="text-center mb-8">
                <div className="text-6xl mb-4 animate-bounce">🍎</div>
                <h1 className="font-comic text-5xl text-white text-stroke-black drop-shadow-lg mb-2">
                    Modo Escola
                </h1>
                <p className="text-yellow-400 font-bold font-heading text-xl">
                    {isRegistering ? 'Cadastro Institucional' : 'Área Restrita aos Educadores'}
                </p>
            </div>

            <div className="bg-[#2d5a3f] border-[8px] border-[#5c3a21] rounded-lg p-8 shadow-2xl transform rotate-1 transition-all duration-300">
                <div className="text-center text-white/50 mb-6 font-comic text-sm border-b border-white/10 pb-2">
                    Sistema de Gestão Pedagógica - Cineasta Kids
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {isRegistering && (
                        <div className="animate-fade-in space-y-4">
                            <div>
                                <label className="block text-white font-bold mb-1 font-heading uppercase text-xs tracking-wider">Nome da Instituição</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3 bg-black/20 border-b-2 border-white/30 text-white font-hand text-xl placeholder-white/30 outline-none focus:border-yellow-400 transition-colors"
                                    placeholder="Ex: Escola Municipal do Saber"
                                    value={schoolName}
                                    onChange={e => setSchoolName(e.target.value)}
                                    style={{ fontFamily: '"Comic Neue", cursive' }}
                                />
                            </div>
                            <div>
                                <label className="block text-white font-bold mb-1 font-heading uppercase text-xs tracking-wider">WhatsApp para Contato</label>
                                <input 
                                    type="tel" 
                                    className="w-full p-3 bg-black/20 border-b-2 border-white/30 text-white font-hand text-xl placeholder-white/30 outline-none focus:border-yellow-400 transition-colors"
                                    placeholder="(00) 00000-0000"
                                    value={whatsapp}
                                    onChange={e => setWhatsapp(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-white font-bold mb-1 font-heading uppercase text-xs tracking-wider">Nome do Educador</label>
                        <input 
                            type="text" 
                            className="w-full p-3 bg-black/20 border-b-2 border-white/30 text-white font-hand text-xl placeholder-white/30 outline-none focus:border-yellow-400 transition-colors"
                            placeholder="Ex: Maria Silva"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{ fontFamily: '"Comic Neue", cursive' }}
                        />
                    </div>

                    <div>
                        <label className="block text-white font-bold mb-1 font-heading uppercase text-xs tracking-wider">
                            {isRegistering ? 'Crie seu Código de Acesso' : 'Código de Acesso Escolar'}
                        </label>
                        <input 
                            type="password" 
                            className="w-full p-3 bg-black/20 border-b-2 border-white/30 text-white font-hand text-xl placeholder-white/30 outline-none focus:border-yellow-400 transition-colors"
                            placeholder="••••••••"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                        />
                        {!isRegistering && <p className="text-xs text-white/40 mt-1">Dica para teste: PROFESSOR123</p>}
                    </div>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500 text-red-100 p-2 rounded text-center text-sm font-bold animate-pulse">
                            🚨 {error}
                        </div>
                    )}

                    <Button variant="success" size="lg" className="w-full border-white shadow-none mt-4" loading={submitting}>
                        {isRegistering ? 'CADASTRAR ESCOLA ✨' : 'ACESSAR SALA DE AULA 🎓'}
                    </Button>
                </form>

                <div className="mt-6 text-center border-t border-white/10 pt-4">
                    <button 
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError('');
                            setCode('');
                        }}
                        className="text-yellow-300 hover:text-yellow-100 underline text-sm font-bold"
                        type="button"
                    >
                        {isRegistering 
                            ? 'Já possui cadastro? Faça Login.' 
                            : 'Primeiro acesso? Cadastre sua Escola aqui.'}
                    </button>
                </div>
            </div>

            <div className="text-center mt-8">
                <Link to="/" className="text-white/60 hover:text-white underline text-sm font-bold">
                    ← Voltar para Cineasta Kids (App Principal)
                </Link>
            </div>
        </div>
    </div>
  );
};

export default SchoolLogin;