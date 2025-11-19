import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-4 z-50 mx-auto max-w-5xl px-4 mb-12">
      <div className="bg-white rounded-full border-4 border-black shadow-cartoon px-4 py-3 flex items-center justify-between relative">
        
        {/* Logo com efeito divertido */}
        <Link to="/" className="flex items-center gap-2 transform hover:rotate-3 transition-transform">
          <div className="w-12 h-12 bg-cartoon-pink rounded-full border-4 border-black flex items-center justify-center font-heading text-white font-bold text-2xl shadow-sm">
            CK
          </div>
          <span className="font-heading font-black text-2xl tracking-tight hidden sm:block text-black drop-shadow-sm">
            CINEASTA <span className="text-cartoon-purple">KID'S</span>
          </span>
        </Link>

        {/* Links estilo 'pílulas' */}
        <div className="flex gap-2 sm:gap-3">
          <NavLink to="/" active={isActive('/')} color="bg-cartoon-yellow">Início 🏠</NavLink>
          <NavLink to="/avatars" active={isActive('/avatars')} color="bg-cartoon-green">Avatares 👾</NavLink>
          <NavLink to="/create-story" active={isActive('/create-story')} color="bg-cartoon-blue">Histórias 📚</NavLink>
        </div>

        {/* Detalhe decorativo */}
        <div className="absolute -z-10 top-2 left-2 w-full h-full bg-black rounded-full opacity-20 blur-sm hidden"></div>
      </div>
    </nav>
  );
};

const NavLink: React.FC<{ to: string; active: boolean; children: React.ReactNode; color: string }> = ({ to, active, children, color }) => (
  <Link 
    to={to} 
    className={`px-3 sm:px-4 py-2 rounded-xl font-heading font-bold text-sm sm:text-base transition-all border-2 ${
      active 
        ? `${color} border-black -translate-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]` 
        : 'bg-transparent border-transparent hover:bg-gray-100 text-gray-600 hover:border-black hover:border-dashed'
    }`}
  >
    {children}
  </Link>
);

export default Navbar;