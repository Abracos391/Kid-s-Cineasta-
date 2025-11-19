import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-4 z-50 mx-auto max-w-5xl px-4 mb-12">
      {/* Cloud shape container */}
      <div className="bg-white rounded-hand border-[3px] border-black shadow-doodle px-6 py-3 flex items-center justify-between relative transform -rotate-1">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 transform hover:scale-105 transition-transform">
          <div className="w-14 h-14 bg-cartoon-yellow rounded-full border-[3px] border-black flex items-center justify-center font-comic text-black text-3xl shadow-sm animate-bounce-slow">
            CK
          </div>
          <div className="flex flex-col -space-y-2">
             <span className="font-comic text-2xl text-black">CINEASTA</span>
             <span className="font-comic text-3xl text-cartoon-pink text-stroke-black tracking-widest">KID'S</span>
          </div>
        </Link>

        {/* Links */}
        <div className="flex gap-2 sm:gap-4">
          <NavLink to="/" active={isActive('/')} color="bg-cartoon-yellow">🏠 Início</NavLink>
          <NavLink to="/avatars" active={isActive('/avatars')} color="bg-cartoon-green">👾 Avatares</NavLink>
          <NavLink to="/create-story" active={isActive('/create-story')} color="bg-cartoon-blue">📚 Histórias</NavLink>
        </div>

        {/* Decorative Scribble */}
        <svg className="absolute -bottom-8 -right-4 w-16 h-16 text-black opacity-80 rotate-12 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5">
            <path d="M10,50 Q30,20 50,50 T90,50" />
        </svg>
      </div>
    </nav>
  );
};

const NavLink: React.FC<{ to: string; active: boolean; children: React.ReactNode; color: string }> = ({ to, active, children, color }) => (
  <Link 
    to={to} 
    className={`px-3 sm:px-5 py-2 rounded-hand font-comic text-lg sm:text-xl transition-all border-[3px] ${
      active 
        ? `${color} border-black -translate-y-1 shadow-doodle-hover rotate-1 text-black` 
        : 'bg-transparent border-transparent hover:bg-gray-100 text-gray-500 hover:border-gray-300 hover:border-dashed'
    }`}
  >
    {children}
  </Link>
);

export default Navbar;