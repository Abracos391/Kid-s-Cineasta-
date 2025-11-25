
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const SchoolLogin: React.FC = () => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  
  const { loginAsTeacher } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (!name.trim()) throw new Error("Por favor, identifique-se Professor(a).");
      
      loginAsTeacher(name, code);
      navigate('/school'); // Redireciona para a Sala de Aula
    } catch (err: any) {
      setError(err.message || "Acesso negado.");
    }
  };

  return (
    <div className="min-h-screen bg-[#1a3c28] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
        
        <div className="max-w-md w-full relative z-10">
            <div className="text-center mb-8">
                <div className="text-6xl mb-4 animate-bounce">🍎</div>
                <h1 className="font-comic text-5xl text-white text-stroke-black drop-shadow-lg mb-2">
                    Modo Escola
                </h1>
                <p className="text-yellow-400 font-bold font-heading text-xl">Área Restrita aos Educadores</p>
            </div>

            <div className="bg-[#2d5a3f] border-[8px] border-[#5c3a21] rounded-lg p-8 shadow-2xl transform rotate-1">
                <div className="text-center text-white/50 mb-6 font-comic text-sm border-b border-white/10 pb-2">
                    Sistema de Gestão Pedagógica - Cineasta Kids
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
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
                        <label className="block text-white font-bold mb-1 font-heading uppercase text-xs tracking-wider">Código de Acesso Escolar</label>
                        <input 
                            type="password" 
                            className="w-full p-3 bg-black/20 border-b-2 border-white/30 text-white font-hand text-xl placeholder-white/30 outline-none focus:border-yellow-400 transition-colors"
                            placeholder="••••••••"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                        />
                        <p className="text-xs text-white/40 mt-1">Dica para teste: PROFESSOR123</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500 text-red-100 p-2 rounded text-center text-sm font-bold">
                            🚨 {error}
                        </div>
                    )}

                    <Button variant="success" size="lg" className="w-full border-white shadow-none mt-4">
                        ACESSAR SALA DE AULA 🎓
                    </Button>
                </form>
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
