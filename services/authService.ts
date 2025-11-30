
import { User } from '../types';
import { idbService } from './idbService';

// Chave para simular sessão no SessionStorage (que dura enquanto a aba está aberta ou recarrega)
const SESSION_KEY = 'cineasta_session_user_id';

export const authService = {

  // --- REGISTRO ---

  register: async (name: string, email: string, password: string): Promise<User> => {
    // 1. Verifica se já existe
    const existing = await idbService.findUserByEmail(email);
    if (existing) {
        throw new Error('Este e-mail já está cadastrado.');
    }

    // 2. Cria usuário
    const userId = crypto.randomUUID();
    const newUser: User = {
        id: userId,
        name,
        email,
        // Em um app real, salvaríamos o hash da senha. Aqui salvamos a senha crua pois é local.
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
    
    // Auto-login
    sessionStorage.setItem(SESSION_KEY, userId);
    return newUser;
  },

  // --- LOGIN ---

  login: async (email: string, password: string): Promise<User> => {
    const user = await idbService.findUserByEmail(email);
    
    // @ts-ignore - Acessando senha salva localmente
    if (!user || user.password !== password) {
        throw new Error('E-mail ou senha inválidos.');
    }

    // Reset mensal check
    const now = new Date();
    const lastReset = user.lastResetDate ? new Date(user.lastResetDate) : new Date(0);
    
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
     // Usa o código de acesso como "email" fictício para busca única
     const fakeEmail = `code_${accessCode}@school.local`;
     
     let user = await idbService.findUserByEmail(fakeEmail);

     // Se o usuário não existe, mas usou um código válido (lógica de convite), criamos na hora?
     // Na lógica anterior, o registro era separado. Aqui vamos manter a busca.
     if (!user) {
         throw new Error("Escola não encontrada. Cadastre-se primeiro.");
     }

     sessionStorage.setItem(SESSION_KEY, user.id);
     return user;
  },

  registerSchool: async (schoolName: string, teacherName: string, accessCode: string): Promise<User> => {
      const fakeEmail = `code_${accessCode}@school.local`;
      
      const existing = await idbService.findUserByEmail(fakeEmail);
      if (existing) throw new Error("Este código de acesso já está em uso.");

      const userId = crypto.randomUUID();
      const newSchoolUser: User = {
            id: userId,
            name: `Prof. ${teacherName}`,
            email: fakeEmail,
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

  // --- REGRAS DE NEGÓCIO ---

  canCreateStory: (user: User): { allowed: boolean; type?: 'premium' | 'free'; reason?: string } => {
    if (user.isSchoolUser) {
        if ((user.schoolStoriesUsed || 0) < 10) return { allowed: true, type: 'premium' };
        return { allowed: false, reason: 'Pacote escolar esgotado.' };
    }
    if (user.plan === 'premium' || user.plan === 'enterprise') {
      if (user.credits > 0) return { allowed: true, type: 'premium' };
      return { allowed: false, reason: 'Créditos Premium esgotados.' };
    } 
    
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
