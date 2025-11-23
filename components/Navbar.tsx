
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Se estiver na página de login, esconde a navbar
  if (location.pathname === '/auth') return null;

  const isActive = (path: string) => location.pathname === path;
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="sticky top-2 z-50 mx-auto max-w-6xl px-2 md:px-4 mb-8 font-comic">
      {/* Main Bar */}
      <div className="bg-white rounded-hand border-[3px] border-black shadow-doodle px-4 py-2 relative z-50">
        <div className="flex items-center justify-between">
          
          {/* Logo (Esquerda) */}
          <Link to="/" className="flex items-center gap-2 group" onClick={closeMenu}>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-cartoon-yellow rounded-full border-[3px] border-black flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform">
               <span className="font-comic text-xl md:text-2xl text-cartoon-pink text-stroke-black mt-1">CK</span>
            </div>
            <div className="flex flex-col -space-y-1 leading-none">
               <span className="text-base md:text-lg text-black font-bold">CINEASTA</span>
               <span className="text-lg md:text-xl text-cartoon-pink text-stroke-black tracking-widest">KID'S</span>
            </div>
          </Link>

          {/* Desktop Menu (Centro) - Hidden on Mobile */}
          <div className="hidden md:flex gap-2">
            <NavLink to="/" active={isActive('/')} color="bg-cartoon-yellow">🏠 Início</NavLink>
            <NavLink to="/avatars" active={isActive('/avatars')} color="bg-cartoon-green">👾 Avatares</NavLink>
            <NavLink to="/create-story" active={isActive('/create-story')} color="bg-cartoon-blue">📚 Criar</NavLink>
            <NavLink to="/library" active={isActive('/library')} color="bg-cartoon-purple">🏰 Biblioteca</NavLink>
          </div>

          {/* User Actions (Direita Desktop) */}
          <div className="hidden md:flex items-center gap-3 pl-4 border-l-2 border-black border-dashed">
            <UserSection user={user} logout={logout} />
          </div>

          {/* Mobile Hamburger Button */}
          <button 
            onClick={toggleMenu}
            className="md:hidden p-2 border-[3px] border-black rounded-lg bg-cartoon-blue text-white shadow-sm active:translate-y-1 active:shadow-none transition-all"
          >
            {isMenuOpen ? (
              <span className="text-2xl leading-none block">✕</span>
            ) : (
              <span className="text-2xl leading-none block">☰</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 px-2 mt-2 animate-float">
          <div className="bg-cartoon-cream border-[3px] border-black rounded-hand p-4 shadow-doodle flex flex-col gap-4 relative">
             {/* Decorative triangle for speech bubble effect */}
             <div className="absolute -top-3 right-8 w-6 h-6 bg-cartoon-cream border-l-[3px] border-t-[3px] border-black transform rotate-45 z-0"></div>
             
             <div className="flex flex-col gap-3 z-10">
                <MobileNavLink to="/" onClick={closeMenu} active={isActive('/')} emoji="🏠">Início</MobileNavLink>
                <MobileNavLink to="/avatars" onClick={closeMenu} active={isActive('/avatars')} emoji="👾">Avatares</MobileNavLink>
                <MobileNavLink to="/create-story" onClick={closeMenu} active={isActive('/create-story')} emoji="📚">Criar História</MobileNavLink>
                <MobileNavLink to="/library" onClick={closeMenu} active={isActive('/library')} emoji="🏰">Minha Biblioteca</MobileNavLink>
             </div>

             <div className="border-t-2 border-black border-dashed my-1"></div>
             
             <div className="flex justify-center pb-2 z-10">
                <UserSection user={user} logout={logout} isMobile={true} onClick={closeMenu} />
             </div>
          </div>
        </div>
      )}
    </nav>
  );
};

// Componente auxiliar para Info do Usuário (Reutilizável)
const UserSection: React.FC<{ user: any, logout: () => void, isMobile?: boolean, onClick?: () => void }> = ({ user, logout, isMobile, onClick }) => {
  if (!user) {
    return (
      <Link to="/auth" onClick={onClick}>
        <Button size="sm" variant="primary">Entrar / Cadastrar</Button>
      </Link>
    );
  }

  return (
    <div className={`flex ${isMobile ? 'flex-col items-center gap-3 w-full' : 'flex-col items-end'}`}>
      <div className="font-bold text-xs uppercase tracking-wider">
          {user.plan === 'premium' ? (
              <span className="text-purple-600 font-comic text-sm border-2 border-purple-300 px-2 py-0.5 rounded bg-purple-50 block">
                👑 Premium ({user.credits} cr.)
              </span>
          ) : (
              <span className="text-gray-600 font-comic text-sm border-2 border-gray-300 px-2 py-0.5 rounded bg-gray-50 block">
                🆓 Free ({4 - user.storiesCreatedThisMonth} rest.)
              </span>
          )}
      </div>
      <div className={`flex gap-2 ${isMobile ? 'w-full justify-center' : ''}`}>
          <Link to="/pricing" onClick={onClick} className={isMobile ? 'flex-1' : ''}>
                <button className={`text-xs bg-green-400 text-black px-3 py-1 rounded border-2 border-black font-bold hover:bg-green-500 shadow-sm ${isMobile ? 'w-full h-10 text-lg' : ''}`}>
                  💎 Planos
                </button>
          </Link>
          <button 
            onClick={() => { logout(); if(onClick) onClick(); }} 
            className={`text-xs bg-red-400 text-white px-3 py-1 rounded border-2 border-black font-bold hover:bg-red-500 shadow-sm ${isMobile ? 'flex-1 h-10 text-lg' : ''}`}
          >
            Sair
          </button>
      </div>
    </div>
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

const MobileNavLink: React.FC<{ to: string; onClick: () => void; active: boolean; children: React.ReactNode; emoji: string }> = ({ to, onClick, active, children, emoji }) => (
  <Link 
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all font-bold text-xl ${
      active
        ? 'bg-cartoon-yellow border-black shadow-sm'
        : 'bg-white border-gray-200 hover:border-black hover:bg-gray-50'
    }`}
  >
    <span className="text-2xl">{emoji}</span>
    <span className={active ? 'text-black' : 'text-gray-600'}>{children}</span>
    {active && <span className="ml-auto text-cartoon-pink">★</span>}
  </Link>
);

export default Navbar;
