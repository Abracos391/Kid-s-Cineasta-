
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

  // Login Padrão (Família/Criança)
  login: (email: string, password: string): User => {
    const users = getUsers();
    const cleanEmail = email.toLowerCase().trim();
    const user = users.find(u => u.email.toLowerCase().trim() === cleanEmail);

    if (!user) {
      throw new Error('Usuário não encontrado. Verifique o e-mail.');
    }
    
    // Se tentar logar com credencial de escola no login comum, remove a flag ou avisa
    user.isSchoolUser = false;

    // Reset mensal automático para plano FREE e PREMIUM (simulado)
    const now = new Date();
    const lastReset = new Date(user.lastResetDate);
    
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      user.monthlyFreeUsed = 0;
      user.monthlyPremiumTrialUsed = 0;
      
      // Se for Premium recorrente, renovaria os créditos aqui. 
      // Como é pacote avulso no modelo atual, mantemos os créditos existentes.
      
      user.lastResetDate = Date.now();
      
      const userIndex = users.findIndex(u => u.id === user.id);
      users[userIndex] = user;
      saveUsers(users);
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  // --- LOGIN EXCLUSIVO MODO ESCOLA ---
  
  loginAsTeacher: (teacherName: string, accessCode: string): User => {
    const SCHOOL_CODE = "PROFESSOR123";

    if (accessCode !== SCHOOL_CODE) {
         throw new Error("Código de Acesso Escolar Inválido.");
    }

    const teacherUser: User = {
        id: `school_${Date.now()}`,
        name: `Prof. ${teacherName}`,
        email: 'school_mode@cineastakids.edu',
        plan: 'premium',
        credits: 10, // Pacote Escola: 10 histórias
        schoolStoriesUsed: 0,
        monthlyFreeUsed: 0,
        monthlyPremiumTrialUsed: 0,
        lastResetDate: Date.now(),
        isSchoolUser: true,
        schoolName: 'Escola Cineasta Kids',
        maxStudents: 40
    };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(teacherUser));
    return teacherUser;
  },

  // Cadastro de Escola
  registerSchool: (schoolName: string, teacherName: string, accessCode: string): User => {
      const newSchoolUser: User = {
        id: `school_${Date.now()}`,
        name: `Prof. ${teacherName}`,
        email: `${teacherName.toLowerCase().replace(/\s/g, '.')}@${schoolName.toLowerCase().replace(/\s/g, '')}.edu`,
        plan: 'premium',
        credits: 10, // Pacote inicial Escola: 10 histórias
        schoolStoriesUsed: 0,
        monthlyFreeUsed: 0,
        monthlyPremiumTrialUsed: 0,
        lastResetDate: Date.now(),
        isSchoolUser: true,
        schoolName: schoolName,
        maxStudents: 40
    };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newSchoolUser));
    return newSchoolUser;
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  // REGRAS DE NEGÓCIO (PERMISSÕES)
  canCreateStory: (user: User): { allowed: boolean; type?: 'premium' | 'free'; reason?: string } => {
    // 1. MODO ESCOLA
    if (user.isSchoolUser) {
        const used = user.schoolStoriesUsed || 0;
        // Limite: 10 histórias no pacote
        if (used < 10) return { allowed: true, type: 'premium' };
        return { allowed: false, reason: 'O pacote de 10 aulas da escola acabou. Contrate um novo pacote por R$ 99,00.' };
    }

    // 2. PLANO PREMIUM (Individual)
    if (user.plan === 'premium') {
      if (user.credits > 0) return { allowed: true, type: 'premium' };
      return { allowed: false, reason: 'Seus créditos Premium acabaram. Adquira mais na loja!' };
    } 
    
    // 3. PLANO FREE
    // Regra: 1 História Premium (Full) + 3 Histórias Standard (Texto)
    
    // Prioridade 1: Tenta usar a cota Premium gratuita do mês
    if (user.monthlyPremiumTrialUsed < 1) {
        return { allowed: true, type: 'premium' }; 
    }
    
    // Prioridade 2: Tenta usar a cota Standard gratuita (sem áudio/save)
    if (user.monthlyFreeUsed < 3) {
        return { allowed: true, type: 'free' };
    }

    return { allowed: false, reason: 'Você atingiu o limite mensal (1 Completa + 3 Texto). Volte mês que vem ou faça upgrade!' };
  },

  // Consumir Cota
  consumeStoryCredit: (userId: string, type: 'premium' | 'free'): User => {
    const users = getUsers();
    
    // Tratamento para Escola (não persiste em 'users' principal, mas no currentUser mockado para este frontend)
    if (userId.startsWith('school_')) {
        const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
        currentUser.schoolStoriesUsed = (currentUser.schoolStoriesUsed || 0) + 1;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
        return currentUser;
    }

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("Usuário não encontrado");
    const user = users[userIndex];

    if (user.plan === 'premium') {
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
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  // Comprar Pacotes
  buyPack: (userId: string, packType: 'premium_5' | 'school_10' | 'enterprise_100'): User => {
    const users = getUsers();
    
    // Mock de compra para escola (usuário não listado em 'users')
    if (userId.startsWith('school_')) {
        const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
        if (packType === 'school_10') {
            currentUser.schoolStoriesUsed = Math.max(0, (currentUser.schoolStoriesUsed || 0) - 10); // Reseta uso ou add creditos
            // Simplificação: Reseta o contador de uso para 0 (novo ciclo)
            currentUser.schoolStoriesUsed = 0; 
        }
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
        return currentUser;
    }

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("Usuário não encontrado");
    const user = users[userIndex];
    
    if (packType === 'premium_5') {
        user.plan = 'premium';
        user.credits = (user.credits || 0) + 5;
    }
    
    if (packType === 'enterprise_100') {
        user.plan = 'enterprise';
        user.credits = (user.credits || 0) + 100;
    }

    users[userIndex] = user;
    saveUsers(users);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }
};
