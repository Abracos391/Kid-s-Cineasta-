import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { i18n, t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Não exibe navbar nas telas de login
  if (location.pathname === '/auth' || location.pathname === '/school-login') return null;

  const isActive = (path: string) => location.pathname === path;
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const isSchoolMode = user?.isSchoolUser;

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <nav className="sticky top-2 z-50 mx-auto max-w-6xl px-4 mb-8 font-comic">
      <div className={`bg-white rounded-full border-[3px] border-black shadow-doodle px-4 py-2 relative z-50 transition-all hover:shadow-doodle-hover ${isSchoolMode ? 'bg-[#f0f4f1]' : ''}`}>
        <div className="flex items-center justify-between">
          
          <Link to={isSchoolMode ? "/school" : "/"} className="flex items-center gap-3 group" onClick={closeMenu}>
            <div className="relative">
                <div className={`w-12 h-12 rounded-full border-[3px] border-black flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform z-10 relative ${isSchoolMode ? 'bg-green-700' : 'bg-cartoon-yellow'}`}>
                    <span className={`font-comic text-2xl text-stroke-black mt-1 ${isSchoolMode ? 'text-white' : 'text-cartoon-pink'}`}>CK</span>
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-black rounded-full translate-x-0.5 translate-y-0.5 -z-10"></div>
            </div>
            
            <div className="flex flex-col -space-y-1 leading-none">
               <span className="text-lg text-black font-bold group-hover:text-cartoon-blue transition-colors">CINEASTA</span>
               <span className="text-xl tracking-widest group-hover:scale-105 transition-transform origin-left flex items-center gap-1">
                   <span className={isSchoolMode ? 'text-green-700 text-stroke-black' : 'text-cartoon-pink text-stroke-black'}>KID'S</span>
                   {isSchoolMode && <span className="text-xs bg-green-700 text-white px-1 rounded border border-black">ESCOLA</span>}
               </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {!isSchoolMode ? (
                <>
                    <NavLink to="/" active={isActive('/')} color="bg-cartoon-yellow">🏠 Início</NavLink>
                    <NavLink to="/avatars" active={isActive('/avatars')} color="bg-cartoon-green">👾 Avatares</NavLink>
                    <NavLink to="/create-story" active={isActive('/create-story')} color="bg-cartoon-blue">📚 Criar</NavLink>
                    <NavLink to="/library" active={isActive('/library')} color="bg-cartoon-purple">🏰 Biblioteca</NavLink>
                </>
            ) : (
                <>
                    <NavLink to="/school" active={isActive('/school')} color="bg-green-300">🏫 Sala de Aula</NavLink>
                    <NavLink to="/school-library" active={isActive('/school-library')} color="bg-yellow-300">📚 Biblioteca Escolar</NavLink>
                    <NavLink to="/avatars?returnTo=/school" active={isActive('/avatars')} color="bg-blue-300">👤 Novo Aluno</NavLink>
                </>
            )}
            
            <NavLink to="/tutorial" active={isActive('/tutorial')} color="bg-gray-200">❓ Ajuda</NavLink>
            
            <div className="w-0.5 h-8 bg-black/10 mx-2 rounded-full"></div>

            {/* Language Switcher */}
            <div className="flex gap-1 mr-2">
              <button 
                onClick={() => changeLanguage('pt-BR')} 
                className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-xs font-bold transition-all ${i18n.language === 'pt-BR' ? 'bg-cartoon-yellow scale-110 shadow-sm' : 'bg-gray-200 opacity-60'}`}
                title={t('common.pt_br')}
              >
                PT
              </button>
              <button 
                onClick={() => changeLanguage('en-US')} 
                className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-xs font-bold transition-all ${i18n.language === 'en-US' ? 'bg-cartoon-blue scale-110 shadow-sm' : 'bg-gray-200 opacity-60'}`}
                title={t('common.en_us')}
              >
                EN
              </button>
            </div>

            <UserSection user={user} logout={logout} />
          </div>

          <button 
            onClick={toggleMenu}
            className="md:hidden relative group"
            aria-label="Abrir Menu"
          >
            <div className={`w-10 h-10 border-[3px] border-black rounded-lg flex items-center justify-center transition-all ${isMenuOpen ? 'bg-cartoon-pink text-white rotate-90' : 'bg-cartoon-blue text-white'} shadow-sm active:shadow-none active:translate-y-1`}>
                <span className="text-2xl leading-none font-bold">{isMenuOpen ? '✕' : '☰'}</span>
            </div>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={closeMenu}></div>
            <div className="absolute top-full left-0 right-0 px-2 mt-4 z-50 md:hidden animate-float">
                <div className="bg-white border-[3px] border-black rounded-hand p-6 shadow-cartoon relative overflow-hidden">
                    <div className="relative z-10 flex flex-col gap-3">
                        {!isSchoolMode ? (
                            <>
                                <MobileNavLink to="/" onClick={closeMenu} active={isActive('/')} emoji="🏠" color="hover:bg-cartoon-yellow">Início</MobileNavLink>
                                <MobileNavLink to="/avatars" onClick={closeMenu} active={isActive('/avatars')} emoji="👾" color="hover:bg-cartoon-green">Avatares</MobileNavLink>
                                <MobileNavLink to="/create-story" onClick={closeMenu} active={isActive('/create-story')} emoji="📚" color="hover:bg-cartoon-blue">Criar História</MobileNavLink>
                                <MobileNavLink to="/library" onClick={closeMenu} active={isActive('/library')} emoji="🏰" color="hover:bg-cartoon-purple">Minha Biblioteca</MobileNavLink>
                            </>
                        ) : (
                            <>
                                <MobileNavLink to="/school" onClick={closeMenu} active={isActive('/school')} emoji="🏫" color="hover:bg-green-300">Sala de Aula</MobileNavLink>
                                <MobileNavLink to="/school-library" onClick={closeMenu} active={isActive('/school-library')} emoji="📚" color="hover:bg-yellow-300">Biblioteca Escolar</MobileNavLink>
                                <MobileNavLink to="/avatars?returnTo=/school" onClick={closeMenu} active={isActive('/avatars')} emoji="👤" color="hover:bg-blue-300">Criar Aluno</MobileNavLink>
                            </>
                        )}

                        <MobileNavLink to="/tutorial" onClick={closeMenu} active={isActive('/tutorial')} emoji="❓" color="hover:bg-gray-200">Ajuda</MobileNavLink>

                        {/* Mobile Language Switcher */}
                        <div className="flex justify-center gap-4 my-2">
                           <button onClick={() => changeLanguage('pt-BR')} className={`px-4 py-2 rounded-xl border-2 border-black font-bold ${i18n.language === 'pt-BR' ? 'bg-cartoon-yellow' : 'bg-gray-100'}`}>PT-BR</button>
                           <button onClick={() => changeLanguage('en-US')} className={`px-4 py-2 rounded-xl border-2 border-black font-bold ${i18n.language === 'en-US' ? 'bg-cartoon-blue' : 'bg-gray-100'}`}>EN-US</button>
                        </div>

                        <div className="h-0.5 bg-black/10 w-full my-4 border-t-2 border-dashed border-black/20"></div>
                        <div className="flex justify-center w-full">
                            <UserSection user={user} logout={logout} isMobile={true} onClick={closeMenu} />
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}
    </nav>
  );
};

const UserSection: React.FC<{ user: any, logout: () => void, isMobile?: boolean, onClick?: () => void }> = ({ user, logout, isMobile, onClick }) => {
  if (!user) {
    return (
      <Link to="/auth" onClick={onClick} className={isMobile ? 'w-full' : ''}>
        <Button size="sm" variant="primary" className={isMobile ? 'w-full text-xl' : ''}>🔐 Entrar</Button>
      </Link>
    );
  }

  return (
    <div className={`flex ${isMobile ? 'flex-col items-center gap-4 w-full' : 'items-center gap-3'}`}>
        <div className="relative group cursor-help">
          {user.isSchoolUser ? (
             <span className="bg-green-700 text-white border-2 border-black px-3 py-1 rounded-lg font-bold text-xs shadow-sm flex items-center gap-1">
                🎓 EDUCADOR
             </span>
          ) : (
            user.plan === 'premium' ? (
                <span className="bg-cartoon-purple text-white border-2 border-black px-3 py-1 rounded-lg font-bold text-xs shadow-sm flex items-center gap-1 transform hover:scale-105 transition-transform">
                    👑 PRO <span className="bg-white text-black px-1 rounded text-[10px]">{user.credits}</span>
                </span>
            ) : (
                <span className="bg-gray-200 text-gray-600 border-2 border-black px-3 py-1 rounded-lg font-bold text-xs shadow-sm flex items-center gap-1 transform hover:scale-105 transition-transform">
                    🆓 FREE <span className="bg-white text-black px-1 rounded text-[10px]">{4 - user.monthlyFreeUsed - user.monthlyPremiumTrialUsed}</span>
                </span>
            )
          )}
        </div>

      <div className={`flex gap-2 ${isMobile ? 'w-full grid grid-cols-2' : ''}`}>
          {!user.isSchoolUser && (
              <Link to="/pricing" onClick={onClick} className="flex-1">
                <button className="w-full bg-cartoon-green text-black px-3 py-1.5 rounded-lg border-2 border-black font-bold hover:bg-green-400 hover:shadow-sm transition-colors text-sm flex items-center justify-center gap-1">
                💎 <span className="hidden md:inline">Planos</span>
                </button>
            </Link>
          )}
          <button 
            onClick={() => { logout(); if(onClick) onClick(); }} 
            className="w-full bg-red-400 text-white px-3 py-1.5 rounded-lg border-2 border-black font-bold hover:bg-red-500 hover:shadow-sm transition-colors text-sm flex items-center justify-center gap-1"
          >
            {user.isSchoolUser ? 'Sair' : 'Sair'}
          </button>
      </div>
    </div>
  );
};

const NavLink: React.FC<{ to: string; active: boolean; children: React.ReactNode; color: string }> = ({ to, active, children, color }) => (
  <Link 
    to={to} 
    className={`px-3 py-1.5 rounded-lg font-comic text-lg transition-all border-2 whitespace-nowrap ${
      active 
        ? `${color} border-black shadow-doodle rotate-1 text-black` 
        : 'bg-transparent border-transparent hover:bg-gray-100 hover:border-gray-200 text-gray-500'
    }`}
  >
    {children}
  </Link>
);

const MobileNavLink: React.FC<{ to: string; onClick: () => void; active: boolean; children: React.ReactNode; emoji: string; color: string }> = ({ to, onClick, active, children, emoji, color }) => (
  <Link 
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all font-bold text-xl ${
      active
        ? 'bg-black text-white border-black shadow-doodle transform -rotate-1'
        : `bg-white border-gray-100 text-gray-600 ${color} hover:border-black hover:shadow-sm`
    }`}
  >
    <span className="text-2xl">{emoji}</span>
    <span>{children}</span>
  </Link>
);

export default Navbar;