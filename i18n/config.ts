import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  'pt-BR': {
    translation: {
      "auth": {
        "title_login": "Entrar",
        "title_register": "Criar Conta",
        "welcome_back": "Bem-vindo de volta ao mundo da imaginação!",
        "welcome_new": "Bem-vindo ao mundo da imaginação!",
        "subtitle_login": "Use seu WhatsApp para entrar!",
        "subtitle_register": "Cadastre-se para começar a mágica!",
        "name_label": "Nome do Responsável",
        "name_placeholder": "Ex: Papai do João",
        "whatsapp_label": "WhatsApp (com DDD)",
        "whatsapp_placeholder": "(00) 00000-0000",
        "password_label": "Senha",
        "password_placeholder": "******",
        "btn_login": "🚀 ENTRAR",
        "btn_register": "✨ CADASTRAR",
        "toggle_to_register": "Não tem conta? Cadastre-se grátis!",
        "toggle_to_login": "Já tem conta? Entre aqui.",
        "admin_notification": "🔔 Ao cadastrar, notificaremos nosso suporte no WhatsApp.",
        "tutorial_btn": "Como usar o App?"
      },
      "common": {
        "app_name": "Cineasta Kids",
        "loading": "Carregando...",
        "language_selector": "Idioma",
        "pt_br": "Português",
        "en_us": "Inglês"
      }
    }
  },
  'en-US': {
    translation: {
      "auth": {
        "title_login": "Sign In",
        "title_register": "Create Account",
        "welcome_back": "Welcome back to the world of imagination!",
        "welcome_new": "Welcome to the world of imagination!",
        "subtitle_login": "Use your WhatsApp to sign in!",
        "subtitle_register": "Sign up to start the magic!",
        "name_label": "Guardian's Name",
        "name_placeholder": "e.g., John's Dad",
        "whatsapp_label": "WhatsApp (with Area Code)",
        "whatsapp_placeholder": "Enter number",
        "password_label": "Password",
        "password_placeholder": "******",
        "btn_login": "🚀 SIGN IN",
        "btn_register": "✨ SIGN UP",
        "toggle_to_register": "Don't have an account? Sign up for free!",
        "toggle_to_login": "Already have an account? Sign in here.",
        "admin_notification": "🔔 Upon registration, we will notify our support on WhatsApp.",
        "tutorial_btn": "How to use the App?"
      },
      "common": {
        "app_name": "Cineasta Kids",
        "loading": "Loading...",
        "language_selector": "Language",
        "pt_br": "Portuguese",
        "en_us": "English"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('i18nextLng') || 'pt-BR',
    fallbackLng: 'pt-BR',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;