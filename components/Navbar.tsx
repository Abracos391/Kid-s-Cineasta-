
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  // Se estiver na página de login, esconde a navbar
  if (location.pathname === '/auth') return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-4 z-50 mx-auto max-w-6xl px-4 mb-12">
      {/* Cloud shape container */}
      <div className="bg-white rounded-hand border-[3px] border-black shadow-doodle px-4 py-3 flex flex-col md:flex-row items-center justify-between relative transform -rotate-1 gap-4">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 transform hover:scale-105 transition-transform">
          <img src="/logo.svg" alt="Cineasta Kids Logo" className="w-16 h-16 object-contain drop-shadow-sm" />
          <div className="flex flex-col -space-y-2">
             <span className="font-comic text-xl text-black">CINEASTA</span>
             <span className="font-comic text-2xl text-cartoon-pink text-stroke-black tracking-widest">KID'S</span>
          </div>
        </Link>

        {/* Links */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-full pb-2 md:pb-0">
          <NavLink to="/" active={isActive('/')} color="bg-cartoon-yellow">🏠 Início</NavLink>
          <NavLink to="/avatars" active={isActive('/avatars')} color="bg-cartoon-green">👾 Avatares</NavLink>
          <NavLink to="/create-story" active={isActive('/create-story')} color="bg-cartoon-blue">📚 Criar</NavLink>
          <NavLink to="/library" active={isActive('/library')} color="bg-cartoon-purple">🏰 Biblioteca</NavLink>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 border-l-2 border-black pl-4 border-dashed">
            {user ? (
                <div className="flex flex-col items-end">
                    <div className="font-bold text-xs uppercase tracking-wider mb-1">
                        {user.plan === 'premium' ? (
                            <span className="text-purple-600 font-comic text-sm border border-purple-300 px-1 rounded bg-purple-50">👑 Premium ({user.credits} cr.)</span>
                        ) : (
                            <span className="text-gray-600 font-comic text-sm border border-gray-300 px-1 rounded bg-gray-50">🆓 Free ({4 - user.storiesCreatedThisMonth} rest.)</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Link to="/pricing">
                             <button className="text-xs bg-green-500 text-white px-2 py-1 rounded border border-black font-bold hover:bg-green-600 shadow-sm">
                                💎 Comprar
                             </button>
                        </Link>
                        <button onClick={logout} className="text-xs text-red-500 font-bold hover:underline">Sair</button>
                    </div>
                </div>
            ) : (
                <Link to="/auth"><Button size="sm">Entrar</Button></Link>
            )}
        </div>
      </div>
    </nav>
  );
};

const NavLink: React.FC<{ to: string; active: boolean; children: React.ReactNode; color: string }> = ({ to, active, children, color }) => (
  <Link 
    to={to} 
    className={`px-3 py-1 rounded-hand font-comic text-lg transition-all border-[3px] whitespace-nowrap ${
      active 
        ? `${color} border-black -translate-y-1 shadow-doodle-hover rotate-1 text-white text-stroke-black` 
        : 'bg-transparent border-transparent hover:bg-gray-100 text-gray-500 hover:border-gray-300 hover:border-dashed'
    }`}
  >
    {children}
  </Link>
);

export default Navbar;
