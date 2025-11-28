
import { User } from '../types';

const STORAGE_KEYS = {
  USERS: 'ck_users',
  CURRENT_USER_ID: 'ck_current_user_id'
};

// --- HELPER: Simula Banco de Dados Local ---
const getUsers = (): User[] => {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  return data ? JSON.parse(data) : [];
};

const saveUsers = (users: User[]) => {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

export const authService = {
  
  // --- LOGIN / CADASTRO ---

  register: async (name: string, email: string, password: string): Promise<User> => {
    // Simula delay de rede
    await new Promise(r => setTimeout(r, 500));

    const users = getUsers();
    const cleanEmail = email.toLowerCase().trim();

    if (users.find(u => u.email === cleanEmail)) {
      throw new Error('Este e-mail já está cadastrado.');
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email: cleanEmail,
      plan: 'free',
      credits: 0,
      monthlyFreeUsed: 0,
      monthlyPremiumTrialUsed: 0,
      lastResetDate: Date.now(),
      isSchoolUser: false
    };

    users.push(newUser);
    saveUsers(users);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newUser.id); 
    return newUser;
  },

  login: async (email: string, password: string): Promise<User> => {
    await new Promise(r => setTimeout(r, 500));
    
    const users = getUsers();
    const cleanEmail = email.toLowerCase().trim();
    const user = users.find(u => u.email === cleanEmail);

    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    // Reset mensal automático (Simulação)
    const now = new Date();
    const lastReset = user.lastResetDate ? new Date(user.lastResetDate) : new Date(0);

    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
       user.monthlyFreeUsed = 0;
       user.monthlyPremiumTrialUsed = 0;
       user.lastResetDate = Date.now();
       saveUsers(users); // Salva atualização
    }

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    return user;
  },

  // --- MODO ESCOLA ---

  loginAsTeacher: async (teacherName: string, accessCode: string): Promise<User> => {
     await new Promise(r => setTimeout(r, 500));

     // Simula login de escola existente ou cria nova baseada no código
     // Para simplificar no modo local: Se o código for PROFESSOR123, entra.
     
     const users = getUsers();
     // Procura se já existe esse professor
     let teacher = users.find(u => u.isSchoolUser && u.name === `Prof. ${teacherName}`);

     if (teacher) {
         localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, teacher.id);
         return teacher;
     }

     if (accessCode === "PROFESSOR123" || accessCode.length >= 4) {
         // Cria escola on-the-fly para o teste
         return authService.registerSchool('Escola Local', teacherName, accessCode);
     }

     throw new Error("Código de acesso inválido.");
  },

  registerSchool: async (schoolName: string, teacherName: string, accessCode: string): Promise<User> => {
      await new Promise(r => setTimeout(r, 800));
      
      const users = getUsers();
      const newSchoolUser: User = {
        id: crypto.randomUUID(),
        name: `Prof. ${teacherName}`,
        email: `${teacherName.toLowerCase()}@school.com`, // Fake email
        plan: 'premium',
        credits: 10, // Pacote inicial
        schoolStoriesUsed: 0,
        monthlyFreeUsed: 0,
        monthlyPremiumTrialUsed: 0,
        lastResetDate: Date.now(),
        isSchoolUser: true,
        schoolName: schoolName,
        maxStudents: 40
      };

      users.push(newSchoolUser);
      saveUsers(users);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newSchoolUser.id);
      return newSchoolUser;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
  },

  getCurrentUser: async (): Promise<User | null> => {
    const id = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (!id) return null;
    const users = getUsers();
    return users.find(u => u.id === id) || null;
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
    // Regra FREE: 1 Premium + 3 Free
    if ((user.monthlyPremiumTrialUsed || 0) < 1) return { allowed: true, type: 'premium' }; 
    if ((user.monthlyFreeUsed || 0) < 3) return { allowed: true, type: 'free' };

    return { allowed: false, reason: 'Limite mensal atingido.' };
  },

  consumeStoryCredit: async (userId: string, type: 'premium' | 'free'): Promise<void> => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    const user = users[userIndex];

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

    users[userIndex] = user;
    saveUsers(users);
  },

  buyPack: async (userId: string, packType: string): Promise<void> => {
      const users = getUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex === -1) return;

      const user = users[userIndex];
      
      if (packType === 'premium_5') {
          user.plan = 'premium';
          user.credits = (user.credits || 0) + 5;
      } else if (packType === 'enterprise_100') {
          user.plan = 'enterprise';
          user.credits = (user.credits || 0) + 100;
      }

      users[userIndex] = user;
      saveUsers(users);
  }
};
