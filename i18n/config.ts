import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  'pt-BR': {
    translation: {
      "nav": {
        "home": "🏠 Início",
        "avatars": "👾 Avatares",
        "create": "📚 Criar",
        "library": "🏰 Biblioteca",
        "school": "🏫 Sala de Aula",
        "help": "❓ Ajuda",
        "logout": "Sair",
        "login": "🔐 Entrar",
        "school_mode": "ESCOLA"
      },
      "home": {
        "title_main": "CINEASTA",
        "subtitle_main": "Onde sua imaginação vira filme! 🎬",
        "btn_create_avatar": "Criar Meu Avatar",
        "btn_create_story": "Criar História",
        "how_it_works": "Como funciona a mágica?",
        "step1_title": "1. Foto Maluca",
        "step1_desc": "Tire uma foto fazendo careta. O computador vai te desenhar!",
        "step2_title": "2. Robô Artista",
        "step2_desc": "Nossa IA transforma você em um personagem de desenho animado.",
        "step3_title": "3. Show Time!",
        "step3_desc": "Escolha o que acontece e assista sua aventura narrada.",
        "school_area": "Área dos Professores 🍎",
        "school_title": "Modo Escola",
        "school_desc": "Ambiente exclusivo para educadores criarem sequências didáticas e fábulas baseadas na BNCC.",
        "school_btn": "🔐 Acesso do Educador",
        "footer": "Feito com muito 🍫 e 🧃 para crianças de todas as idades."
      },
      "auth": {
        "title_login": "Entrar",
        "title_register": "Criar Conta",
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
        "language_selector": "Idioma"
      }
    }
  },
  'en-US': {
    translation: {
      "nav": {
        "home": "🏠 Home",
        "avatars": "👾 Avatars",
        "create": "📚 Create",
        "library": "🏰 Library",
        "school": "🏫 Classroom",
        "help": "❓ Help",
        "logout": "Logout",
        "login": "🔐 Login",
        "school_mode": "SCHOOL"
      },
      "home": {
        "title_main": "FILMMAKER",
        "subtitle_main": "Where your imagination becomes a movie! 🎬",
        "btn_create_avatar": "Create My Avatar",
        "btn_create_story": "Create Story",
        "how_it_works": "How does the magic work?",
        "step1_title": "1. Crazy Photo",
        "step1_desc": "Take a photo making a face. The computer will draw you!",
        "step2_title": "2. Artist Robot",
        "step2_desc": "Our AI transforms you into a cartoon character.",
        "step3_title": "3. Show Time!",
        "step3_desc": "Choose what happens and watch your narrated adventure.",
        "school_area": "Teachers Area 🍎",
        "school_title": "School Mode",
        "school_desc": "Exclusive environment for educators to create pedagogical sequences and fables.",
        "school_btn": "🔐 Educator Access",
        "footer": "Made with lots of 🍫 and 🧃 for kids of all ages."
      },
      "auth": {
        "title_login": "Sign In",
        "title_register": "Create Account",
        "subtitle_login": "Use your WhatsApp to sign in!",
        "subtitle_register": "Sign up to start the magic!",
        "name_label": "Guardian's Name",
        "name_placeholder": "e.g., John's Dad",
        "whatsapp_label": "WhatsApp",
        "whatsapp_placeholder": "Enter number",
        "password_label": "Password",
        "password_placeholder": "******",
        "btn_login": "🚀 SIGN IN",
        "btn_register": "✨ SIGN UP",
        "toggle_to_register": "Don't have an account? Sign up for free!",
        "toggle_to_login": "Already have an account? Sign in here.",
        "admin_notification": "🔔 Upon registration, we will notify our support on WhatsApp.",
        "tutorial_btn": "How to use?"
      }
    }
  },
  'es-ES': {
    translation: {
      "nav": {
        "home": "🏠 Inicio",
        "avatars": "👾 Avatares",
        "create": "📚 Crear",
        "library": "🏰 Biblioteca",
        "school": "🏫 Aula",
        "help": "❓ Ayuda",
        "logout": "Salir",
        "login": "🔐 Entrar",
        "school_mode": "ESCUELA"
      },
      "home": {
        "title_main": "CINEASTA",
        "subtitle_main": "¡Donde tu imaginación se convierte en película! 🎬",
        "btn_create_avatar": "Crear mi Avatar",
        "btn_create_story": "Crear Historia",
        "how_it_works": "¿Cómo funciona la magia?",
        "step1_title": "1. Foto Loca",
        "step1_desc": "Haz una mueca para la foto. ¡El ordenador te dibujará!",
        "step2_title": "2. Robot Artista",
        "step2_desc": "Nuestra IA te transforma en un personaje de dibujos animados.",
        "step3_title": "3. ¡Show Time!",
        "step3_desc": "Elige qué pasa y mira tu aventura narrada.",
        "school_area": "Área de Profesores 🍎",
        "school_title": "Modo Escuela",
        "school_desc": "Ambiente exclusivo para educadores para crear secuencias didácticas.",
        "school_btn": "🔐 Acceso Educador",
        "footer": "Hecho con mucho 🍫 y 🧃 para niños de todas las edades."
      },
      "auth": {
        "title_login": "Entrar",
        "title_register": "Crear Cuenta",
        "subtitle_login": "¡Usa tu WhatsApp para entrar!",
        "subtitle_register": "¡Regístrate para empezar la magia!",
        "name_label": "Nombre del Tutor",
        "name_placeholder": "Ej: Papá de Juan",
        "whatsapp_label": "WhatsApp",
        "whatsapp_placeholder": "Tu número",
        "password_label": "Contraseña",
        "password_placeholder": "******",
        "btn_login": "🚀 ENTRAR",
        "btn_register": "✨ REGISTRAR",
        "toggle_to_register": "¿No tienes cuenta? ¡Regístrate gratis!",
        "toggle_to_login": "¿Ya tienes cuenta? Entra aquí.",
        "admin_notification": "🔔 Al registrarte, notificaremos a soporte por WhatsApp.",
        "tutorial_btn": "¿Cómo usar?"
      }
    }
  },
  'fr-FR': {
    translation: {
      "nav": {
        "home": "🏠 Accueil",
        "avatars": "👾 Avatars",
        "create": "📚 Créer",
        "library": "🏰 Bibliothèque",
        "school": "🏫 Classe",
        "help": "❓ Aide",
        "logout": "Sortir",
        "login": "🔐 Connexion",
        "school_mode": "ÉCOLE"
      },
      "home": {
        "title_main": "CINÉASTE",
        "subtitle_main": "Où votre imagination devient un film ! 🎬",
        "btn_create_avatar": "Créer mon Avatar",
        "btn_create_story": "Créer Histoire",
        "how_it_works": "Comment fonctionne la magie ?",
        "step1_title": "1. Photo Rigolote",
        "step1_desc": "Prends une photo en faisant une grimace. L'ordinateur va te dessiner !",
        "step2_title": "2. Robot Artiste",
        "step2_desc": "Notre IA vous transforme en personnage de dessin animé.",
        "step3_title": "3. Show Time !",
        "step3_desc": "Choisis ce qui se passe et regarde ton aventure narrée.",
        "school_area": "Espace Enseignants 🍎",
        "school_title": "Mode École",
        "school_desc": "Environnement exclusif pour les éducateurs pour créer des séquences didactiques.",
        "school_btn": "🔐 Accès Éducateur",
        "footer": "Fait avec beaucoup de 🍫 et 🧃 pour les enfants de tous âges."
      },
      "auth": {
        "title_login": "Connexion",
        "title_register": "Créer Compte",
        "subtitle_login": "Utilisez WhatsApp pour vous connecter !",
        "subtitle_register": "Inscrivez-vous pour commencer la magie !",
        "name_label": "Nom du Tuteur",
        "name_placeholder": "Ex: Papa de Jean",
        "whatsapp_label": "WhatsApp",
        "whatsapp_placeholder": "Votre numéro",
        "password_label": "Mot de passe",
        "password_placeholder": "******",
        "btn_login": "🚀 ENTRER",
        "btn_register": "✨ S'INSCRIRE",
        "toggle_to_register": "Pas de compte ? Inscrivez-vous gratuitement !",
        "toggle_to_login": "Déjà un compte ? Connectez-vous ici.",
        "admin_notification": "🔔 Lors de l'inscription, nous informerons le support via WhatsApp.",
        "tutorial_btn": "Aide ?"
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