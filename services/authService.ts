
import { User } from '../types';

// Chave para salvar no localStorage
const USERS_KEY = 'ck_users';
const CURRENT_USER_KEY = 'ck_current_user';

// Simula um banco de dados local
const getUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const authService = {
  // Cadastro
  register: (name: string, email: string, password: string): User => {
    const users = getUsers();
    const cleanEmail = email.toLowerCase().trim();
    
    if (users.find(u => u.email.toLowerCase().trim() === cleanEmail)) {
      throw new Error('Este e-mail já está cadastrado.');
    }

    const newUser: User = {
      id: Date.now().toString(),
      name,
      email: cleanEmail,
      plan: 'free',
      credits: 0,
      monthlyFreeUsed: 0,
      monthlyPremiumTrialUsed: 0,
      lastResetDate: Date.now()
    };

    users.push(newUser);
    saveUsers(users);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    return newUser;
  },

  // Login (Fix C1: Case insensitive check)
  login: (email: string, password: string): User => {
    const users = getUsers();
    const cleanEmail = email.toLowerCase().trim();
    const user = users.find(u => u.email.toLowerCase().trim() === cleanEmail);

    if (!user) {
      throw new Error('Usuário não encontrado. Verifique o e-mail.');
    }

    // Reset mensal automático para plano FREE
    const now = new Date();
    const lastReset = new Date(user.lastResetDate);
    
    // Se mudou o mês ou ano desde o último reset
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      user.monthlyFreeUsed = 0;
      user.monthlyPremiumTrialUsed = 0;
      user.lastResetDate = Date.now();
      
      // Atualiza na lista geral
      const userIndex = users.findIndex(u => u.id === user.id);
      users[userIndex] = user;
      saveUsers(users);
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  // Regras de Negócio: Verificar Permissão
  // Retorna o tipo de história que pode ser criada ('premium' ou 'free') ou null
  canCreateStory: (user: User): { allowed: boolean; type?: 'premium' | 'free'; reason?: string } => {
    if (user.plan === 'premium') {
      if (user.credits > 0) return { allowed: true, type: 'premium' };
      return { allowed: false, reason: 'Seus créditos de história acabaram. Adquira mais na loja!' };
    } 
    
    // Plano FREE (Nova Regra M1)
    // 1. Tenta usar o Premium Trial mensal
    if (user.monthlyPremiumTrialUsed < 1) {
        return { allowed: true, type: 'premium' }; // Usa cota de degustação premium
    }
    
    // 2. Se acabou o premium trial, usa o free (sem salvar/sem audio)
    if (user.monthlyFreeUsed < 2) {
        return { allowed: true, type: 'free' };
    }

    return { allowed: false, reason: 'Você atingiu o limite mensal (1 Premium + 2 Free). Volte mês que vem ou faça upgrade!' };
  },

  // Consumir Cota
  consumeStoryCredit: (userId: string, type: 'premium' | 'free'): User => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) throw new Error("Usuário não encontrado");
    
    const user = users[userIndex];

    if (user.plan === 'premium') {
      user.credits = Math.max(0, user.credits - 1);
    } else {
      // Consumo Plano FREE
      if (type === 'premium') {
         user.monthlyPremiumTrialUsed = (user.monthlyPremiumTrialUsed || 0) + 1;
      } else {
         user.monthlyFreeUsed = (user.monthlyFreeUsed || 0) + 1;
      }
    }

    users[userIndex] = user;
    saveUsers(users);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  // Simula Compra de Pacote
  buyPack: (userId: string): User => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) throw new Error("Usuário não encontrado");
    
    const user = users[userIndex];
    user.plan = 'premium'; // Garante upgrade para Premium
    user.credits = (user.credits || 0) + 5;

    users[userIndex] = user;
    saveUsers(users);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }
};