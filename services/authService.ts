
import { User } from '../types';

// Chave para salvar no localStorage
const USERS_KEY = 'ck_users';
const CURRENT_USER_KEY = 'ck_current_user';

// Simula um banco de dados
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
    
    if (users.find(u => u.email === email)) {
      throw new Error('Este e-mail já está cadastrado.');
    }

    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      plan: 'free',
      credits: 0,
      storiesCreatedThisMonth: 0,
      lastResetDate: Date.now()
    };

    users.push(newUser);
    saveUsers(users);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    return newUser;
  },

  // Login
  login: (email: string, password: string): User => {
    // Obs: Em um app real, a senha seria verificada com hash. 
    // Aqui, estamos simplificando aceitando qualquer senha se o email existir,
    // ou você pode implementar uma checagem simples se quiser salvar a senha no user object.
    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    // Reset mensal automático para plano FREE
    const now = new Date();
    const lastReset = new Date(user.lastResetDate);
    if (now.getMonth() !== lastReset.getMonth()) {
      user.storiesCreatedThisMonth = 0;
      user.lastResetDate = Date.now();
      saveUsers(users.map(u => u.id === user.id ? user : u));
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

  // Regras de Negócio: Consumir Crédito/Cota
  canCreateStory: (user: User): { allowed: boolean; reason?: string } => {
    if (user.plan === 'premium') {
      if (user.credits > 0) return { allowed: true };
      return { allowed: false, reason: 'Sem créditos Premium.' };
    } else {
      if (user.storiesCreatedThisMonth < 4) return { allowed: true };
      return { allowed: false, reason: 'Limite mensal do plano FREE atingido.' };
    }
  },

  consumeStoryCredit: (userId: string): User => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) throw new Error("Usuário não encontrado");
    
    const user = users[userIndex];

    if (user.plan === 'premium') {
      user.credits = Math.max(0, user.credits - 1);
    } else {
      user.storiesCreatedThisMonth += 1;
    }

    users[userIndex] = user;
    saveUsers(users);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  // Simula Compra
  buyPack: (userId: string): User => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) throw new Error("Usuário não encontrado");
    
    const user = users[userIndex];
    user.plan = 'premium'; // Upgrade automático ao comprar
    user.credits += 5;

    users[userIndex] = user;
    saveUsers(users);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }
};
