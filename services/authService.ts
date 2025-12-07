
import { User } from '../types';
import { idbService } from './idbService';

const SESSION_KEY = 'cineasta_session_user_id';

export const authService = {

  // --- REGISTRO ---

  register: async (name: string, whatsapp: string, password: string): Promise<User> => {
    // Remove caracteres não numéricos do zap
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    
    const existing = await idbService.findUserByWhatsapp(cleanWhatsapp);
    if (existing) {
        throw new Error('Este número de WhatsApp já está cadastrado. Tente fazer login.');
    }

    const userId = crypto.randomUUID();
    const newUser: User = {
        id: userId,
        name,
        whatsapp: cleanWhatsapp,
        // @ts-ignore
        password: password, 
        plan: 'free',
        credits: 0,
        monthlyFreeUsed: 0,
        monthlyPremiumTrialUsed: 0,
        lastResetDate: Date.now(),
        isSchoolUser: false
    };

    await idbService.add('users', newUser);
    sessionStorage.setItem(SESSION_KEY, userId);
    return newUser;
  },

  // --- LOGIN ---

  login: async (whatsapp: string, password: string): Promise<User> => {
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    console.log(`Tentando login para: ${cleanWhatsapp}`);
    
    const user = await idbService.findUserByWhatsapp(cleanWhatsapp);
    
    // @ts-ignore
    if (!user) {
         console.error("Usuário não encontrado no DB.");
         throw new Error('Conta não encontrada. Verifique o número ou cadastre-se.');
    }

    // @ts-ignore
    if (user.password !== password) {
        throw new Error('Senha incorreta.');
    }
    
    const now = new Date();
    const lastReset = user.lastResetDate ? new Date(user.lastResetDate) : new Date(0);
    
    // Reset mensal de créditos free
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
         user.monthlyFreeUsed = 0;
         user.monthlyPremiumTrialUsed = 0;
         user.lastResetDate = Date.now();
         await idbService.add('users', user);
    }

    sessionStorage.setItem(SESSION_KEY, user.id);
    return user;
  },

  // --- MODO ESCOLA ---

  loginAsTeacher: async (teacherName: string, accessCode: string): Promise<User> => {
     // Modo escola continua usando código, mas geramos um ID interno
     const fakeWhatsapp = `CODE_${accessCode}`;
     let user = await idbService.findUserByWhatsapp(fakeWhatsapp);

     if (!user) {
         throw new Error("Código não encontrado. Cadastre sua escola primeiro.");
     }

     sessionStorage.setItem(SESSION_KEY, user.id);
     return user;
  },

  registerSchool: async (schoolName: string, teacherName: string, accessCode: string, teacherWhatsapp: string): Promise<User> => {
      const fakeWhatsapp = `CODE_${accessCode}`;
      const existing = await idbService.findUserByWhatsapp(fakeWhatsapp);
      
      if (existing) throw new Error("Este código de acesso já está em uso.");

      const userId = crypto.randomUUID();
      const newSchoolUser: User = {
            id: userId,
            name: `Prof. ${teacherName}`,
            whatsapp: fakeWhatsapp, // Armazena o código como ID
            // @ts-ignore
            password: accessCode,
            plan: 'premium',
            credits: 10,
            schoolStoriesUsed: 0,
            monthlyFreeUsed: 0,
            monthlyPremiumTrialUsed: 0,
            lastResetDate: Date.now(),
            isSchoolUser: true,
            schoolName: schoolName,
            maxStudents: 40
      };

      await idbService.add('users', newSchoolUser);
      sessionStorage.setItem(SESSION_KEY, userId);
      return newSchoolUser;
  },

  logout: async () => {
    sessionStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: async (): Promise<User | null> => {
    const userId = sessionStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    return await idbService.get('users', userId);
  },

  canCreateStory: (user: User): { allowed: boolean; type?: 'premium' | 'free'; reason?: string } => {
    if (user.isSchoolUser) {
        if ((user.schoolStoriesUsed || 0) < 10) return { allowed: true, type: 'premium' };
        return { allowed: false, reason: 'Pacote escolar esgotado.' };
    }
    if (user.plan === 'premium' || user.plan === 'enterprise') {
      if (user.credits > 0) return { allowed: true, type: 'premium' };
      return { allowed: false, reason: 'Créditos Premium esgotados.' };
    } 
    
    // Lógica Free
    if ((user.monthlyPremiumTrialUsed || 0) < 1) return { allowed: true, type: 'premium' }; 
    if ((user.monthlyFreeUsed || 0) < 3) return { allowed: true, type: 'free' };

    return { allowed: false, reason: 'Limite mensal atingido.' };
  },

  consumeStoryCredit: async (userId: string, type: 'premium' | 'free'): Promise<void> => {
    const user = await idbService.get('users', userId);
    if (!user) return;

    if (user.isSchoolUser) {
        user.schoolStoriesUsed = (user.schoolStoriesUsed || 0) + 1;
    } else if (user.plan === 'premium' || user.plan === 'enterprise') {
        user.credits = Math.max(0, user.credits - 1);
    } else {
        if (type === 'premium') {
            user.monthlyPremiumTrialUsed = (user.monthlyPremiumTrialUsed || 0) + 1;
        } else {
            user.monthlyFreeUsed = (user.monthlyFreeUsed || 0) + 1;
        }
    }
    await idbService.add('users', user);
  },

  buyPack: async (userId: string, packType: string): Promise<void> => {
      const user = await idbService.get('users', userId);
      if (!user) return;
      
      if (packType === 'premium_5') {
          user.plan = 'premium';
          user.credits = (user.credits || 0) + 5;
      } else if (packType === 'enterprise_100') {
          user.plan = 'enterprise';
          user.credits = (user.credits || 0) + 100;
      }
      
      await idbService.add('users', user);
  }
};
