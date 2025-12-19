import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

// Admin number for notifications
const ADMIN_PHONE = '5586999334312';

const Auth: React.FC = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false); 
  
  const { login, register, user, loading } = useAuth(); 
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
        if (user.isSchoolUser) {
            navigate('/school');
        } else {
            navigate('/');
        }
    }
  }, [user, loading, navigate]);

  // Máscara de Telefone (BR) - Mantida para manter compatibilidade
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.substring(0, 11);
    
    if (val.length > 2) val = `(${val.substring(0, 2)}) ${val.substring(2)}`;
    if (val.length > 10) val = `${val.substring(0, 10)}-${val.substring(10)}`;
    
    setWhatsapp(val);
  };

  const notifyAdmin = (newUserName: string, userPhone: string) => {
    const msg = `Olá! Novo usuário cadastrado no Cineasta Kids: ${newUserName} (Tel: ${userPhone}).`;
    const link = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(msg)}`;
    window.open(link, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    try {
      const cleanPhone = whatsapp.replace(/\D/g, '');
      if (cleanPhone.length < 10) throw new Error("Número de WhatsApp inválido");

      if (isLogin) {
        await login(cleanPhone, password);
      } else {
        if (!name) throw new Error("Nome é obrigatório");
        await register(name, cleanPhone, password);
        notifyAdmin(name, whatsapp);
        alert("Cadastro realizado!");
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro.");
      setSubmitting(false);
    }
  };

  if (loading) return null; 

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-white/50 relative">
      
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
          <Link to="/tutorial">
             <button className="bg-cartoon-blue text-white font-comic font-bold px-4 py-2 rounded-full border-2 border-black shadow-doodle hover:scale-105 transition-transform animate-bounce-slow flex items-center gap-2">
                 <span>❓</span> {t('auth.tutorial_btn')}
             </button>
          </Link>
      </div>

      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-6 bg-cartoon-yellow rounded-full border-4 border-black flex items-center justify-center shadow-cartoon animate-bounce-slow transform -rotate-3">
                <span className="font-comic text-7xl text-cartoon-pink text-stroke-black tracking-tighter mt-2">CK</span>
            </div>
            
            <h2 className="font-comic text-5xl text-cartoon-blue text-stroke-black mb-2 drop-shadow-md">
                {isLogin ? t('auth.title_login') : t('auth.title_register')}
            </h2>
            <p className="font-sans font-bold text-gray-700">
                {isLogin ? t('auth.subtitle_login') : t('auth.subtitle_register')}
            </p>
        </div>

        <Card color="white" className="transform rotate-1">
            <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                    <div>
                        <label className="block font-bold mb-1 font-heading">{t('auth.name_label')}</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border-4 border-black rounded-xl font-sans outline-none focus:border-cartoon-pink"
                            placeholder={t('auth.name_placeholder')}
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                )}
                
                <div>
                    <label className="block font-bold mb-1 font-heading">{t('auth.whatsapp_label')}</label>
                    <input 
                        type="tel" 
                        className="w-full p-3 border-4 border-black rounded-xl font-sans outline-none focus:border-cartoon-blue"
                        placeholder={t('auth.whatsapp_placeholder')}
                        value={whatsapp}
                        onChange={handlePhoneChange}
                    />
                </div>

                <div>
                    <label className="block font-bold mb-1 font-heading">{t('auth.password_label')}</label>
                    <input 
                        type="password" 
                        className="w-full p-3 border-4 border-black rounded-xl font-sans outline-none focus:border-cartoon-purple"
                        placeholder={t('auth.password_placeholder')}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>

                {error && <p className="text-red-500 font-bold text-center bg-red-100 p-2 rounded-lg border-2 border-red-500 animate-pulse">{error}</p>}

                <Button variant="primary" size="lg" className="w-full" loading={submitting}>
                    {isLogin ? t('auth.btn_login') : t('auth.btn_register')}
                </Button>
            </form>

            <div className="mt-6 text-center border-t-2 border-gray-100 pt-4">
                <button 
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    className="text-blue-600 font-bold hover:underline font-sans"
                    type="button"
                >
                    {isLogin ? t('auth.toggle_to_register') : t('auth.toggle_to_login')}
                </button>
            </div>
        </Card>
        
        {!isLogin && (
            <div className="bg-yellow-100 border-2 border-black p-2 rounded-lg text-center transform -rotate-2">
                <p className="text-xs text-black font-sans font-bold">
                    {t('auth.admin_notification')}
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Auth;