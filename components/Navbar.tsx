import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';

const LANGUAGES = [
  { code: 'pt-BR', label: 'PT', flag: '🇧🇷', color: 'bg-cartoon-yellow' },
  { code: 'en-US', label: 'EN', flag: '🇺🇸', color: 'bg-cartoon-blue' },
  { code: 'es-ES', label: 'ES', flag: '🇪🇸', color: 'bg-cartoon-orange' },
  { code: 'fr-FR', label: 'FR', flag: '🇫🇷', color: 'bg-cartoon-purple' },
];

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { i18n, t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
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
               <span className="text-lg text-black font-bold group-hover:text-cartoon-blue transition-colors">{t('home.title_main')}</span>
               <span className="text-xl tracking-widest group-hover:scale-105 transition-transform origin-left flex items-center gap-1">
                   <span className={isSchoolMode ? 'text-green-700 text-stroke-black' : 'text-cartoon-pink text-stroke-black'}>KID'S</span>
                   {isSchoolMode && <span className="text-xs bg-green-700 text-white px-1 rounded border border-black">{t('nav.school_mode')}</span>}
               </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {!isSchoolMode ? (
                <>
                    <NavLink to="/" active={isActive('/')} color="bg-cartoon-yellow">{t('nav.home')}</NavLink>
                    <NavLink to="/avatars" active={isActive('/avatars')} color="bg-cartoon-green">{t('nav.avatars')}</NavLink>
                    <NavLink to="/create-story" active={isActive('/create-story')} color="bg-cartoon-blue">{t('nav.create')}</NavLink>
                    <NavLink to="/library" active={isActive('/library')} color="bg-cartoon-purple">{t('nav.library')}</NavLink>
                </>
            ) : (
                <>
                    <NavLink to="/school" active={isActive('/school')} color="bg-green-300">🏫 {t('nav.school')}</NavLink>
                    <NavLink to="/school-library" active={isActive('/school-library')} color="bg-yellow-300">📚 {t('nav.library')}</NavLink>
                    <NavLink to="/avatars?returnTo=/school" active={isActive('/avatars')} color="bg-blue-300">👤 {t('nav.create')}</NavLink>
                </>
            )}
            
            <NavLink to="/tutorial" active={isActive('/tutorial')} color="bg-gray-200">{t('nav.help')}</NavLink>
            
            <div className="w-0.5 h-8 bg-black/10 mx-2 rounded-full"></div>

            {/* Language Switcher Desktop */}
            <div className="flex gap-1 mr-2">
              {LANGUAGES.map((lang) => (
                <button 
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)} 
                  className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110 ${i18n.language === lang.code ? `${lang.color} scale-110 shadow-sm ring-2 ring-black/20` : 'bg-gray-100 opacity-50'}`}
                  title={lang.code}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <UserSection user={user} logout={logout} t={t} />
          </div>

          <button 
            onClick={toggleMenu}
            className="md:hidden relative group"
            aria-label="Menu"
          >
            <div className={`w-10 h-10 border-[3px] border-black rounded-lg flex items-center justify-center transition-all ${isMenuOpen ? 'bg-cartoon-pink text-white rotate-90' : 'bg-cartoon-blue text-white'} shadow-sm`}>
                <span className="text-2xl font-bold">{isMenuOpen ? '✕' : '☰'}</span>
            </div>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={closeMenu}></div>
            <div className="absolute top-full left-0 right-0 px-2 mt-4 z-50 md:hidden">
                <div className="bg-white border-[3px] border-black rounded-hand p-6 shadow-cartoon relative overflow-hidden">
                    <div className="relative z-10 flex flex-col gap-3">
                        {!isSchoolMode ? (
                            <>
                                <MobileNavLink to="/" onClick={closeMenu} active={isActive('/')} emoji="🏠" color="hover:bg-cartoon-yellow">{t('nav.home')}</MobileNavLink>
                                <MobileNavLink to="/avatars" onClick={closeMenu} active={isActive('/avatars')} emoji="👾" color="hover:bg-cartoon-green">{t('nav.avatars')}</MobileNavLink>
                                <MobileNavLink to="/create-story" onClick={closeMenu} active={isActive('/create-story')} emoji="📚" color="hover:bg-cartoon-blue">{t('nav.create')}</MobileNavLink>
                                <MobileNavLink to="/library" onClick={closeMenu} active={isActive('/library')} emoji="🏰" color="hover:bg-cartoon-purple">{t('nav.library')}</MobileNavLink>
                            </>
                        ) : (
                            <>
                                <MobileNavLink to="/school" onClick={closeMenu} active={isActive('/school')} emoji="🏫" color="hover:bg-green-300">{t('nav.school')}</MobileNavLink>
                                <MobileNavLink to="/school-library" onClick={closeMenu} active={isActive('/school-library')} emoji="📚" color="hover:bg-yellow-300">{t('nav.library')}</MobileNavLink>
                                <MobileNavLink to="/avatars?returnTo=/school" onClick={closeMenu} active={isActive('/avatars')} emoji="👤" color="hover:bg-blue-300">{t('nav.create')}</MobileNavLink>
                            </>
                        )}

                        <MobileNavLink to="/tutorial" onClick={closeMenu} active={isActive('/tutorial')} emoji="❓" color="hover:bg-gray-200">{t('nav.help')}</MobileNavLink>

                        {/* Mobile Language Switcher */}
                        <div className="flex justify-center gap-2 my-2 overflow-x-auto pb-2">
                           {LANGUAGES.map((lang) => (
                             <button 
                                key={lang.code}
                                onClick={() => { changeLanguage(lang.code); closeMenu(); }} 
                                className={`px-3 py-1.5 rounded-xl border-2 border-black font-bold flex items-center gap-1 ${i18n.language === lang.code ? lang.color : 'bg-gray-100'}`}
                             >
                               <span>{lang.flag}</span>
                               <span className="text-sm">{lang.label}</span>
                             </button>
                           ))}
                        </div>

                        <div className="h-0.5 bg-black/10 w-full my-4 border-t-2 border-dashed border-black/20"></div>
                        <div className="flex justify-center w-full">
                            <UserSection user={user} logout={logout} isMobile={true} onClick={closeMenu} t={t} />
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}
    </nav>
  );
};

const UserSection: React.FC<{ user: any, logout: () => void, isMobile?: boolean, onClick?: () => void, t: any }> = ({ user, logout, isMobile, onClick, t }) => {
  if (!user) {
    return (
      <Link to="/auth" onClick={onClick} className={isMobile ? 'w-full' : ''}>
        <Button size="sm" variant="primary" className={isMobile ? 'w-full text-xl' : ''}>{t('nav.login')}</Button>
      </Link>
    );
  }

  return (
    <div className={`flex ${isMobile ? 'flex-col items-center gap-4 w-full' : 'items-center gap-3'}`}>
      <button 
        onClick={() => { logout(); if(onClick) onClick(); }} 
        className="bg-red-400 text-white px-3 py-1.5 rounded-lg border-2 border-black font-bold hover:bg-red-500 transition-colors text-sm"
      >
        {t('nav.logout')}
      </button>
    </div>
  );
};

const NavLink: React.FC<{ to: string; active: boolean; children: React.ReactNode; color: string }> = ({ to, active, children, color }) => (
  <Link 
    to={to} 
    className={`px-3 py-1.5 rounded-lg font-comic text-lg transition-all border-2 whitespace-nowrap ${
      active 
        ? `${color} border-black shadow-doodle rotate-1 text-black` 
        : 'bg-transparent border-transparent hover:bg-gray-100 text-gray-500'
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
        : `bg-white border-gray-100 text-gray-600 ${color}`
    }`}
  >
    <span className="text-2xl">{emoji}</span>
    <span>{children}</span>
  </Link>
);

export default Navbar;