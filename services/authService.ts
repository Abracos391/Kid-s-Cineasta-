
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
    // Aqui assumimos que é um login pessoal.
    user.isSchoolUser = false;

    // Reset mensal automático para plano FREE
    const now = new Date();
    const lastReset = new Date(user.lastResetDate);
    
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      user.monthlyFreeUsed = 0;
      user.monthlyPremiumTrialUsed = 0;
      user.lastResetDate = Date.now();
      
      const userIndex = users.findIndex(u => u.id === user.id);
      users[userIndex] = user;
      saveUsers(users);
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  // --- LOGIN EXCLUSIVO MODO ESCOLA ---
  
  // Login existente (Professor)
  loginAsTeacher: (teacherName: string, accessCode: string): User => {
    // Código fixo para demonstração. Em produção, viria do backend.
    const SCHOOL_CODE = "PROFESSOR123";

    // Simulação: Aceita o código padrão OU qualquer código se o usuário estiver "simulando" persistência neste MVP
    // Para simplificar: Se não for o código padrão, rejeita (a menos que tenhamos implementado persistência real de escolas, que faremos no register abaixo)
    if (accessCode !== SCHOOL_CODE && accessCode !== 'TESTE') {
         // Verifica se existe uma "sessão salva" (mock) ou rejeita
         // throw new Error("Código de Acesso Escolar Inválido.");
    }
    
    // Para manter compatibilidade com usuários antigos do teste
    if (accessCode !== SCHOOL_CODE) {
         throw new Error("Código de Acesso Escolar Inválido.");
    }

    const teacherUser: User = {
        id: `school_${Date.now()}`,
        name: `Prof. ${teacherName}`,
        email: 'school_mode@cineastakids.edu',
        plan: 'premium',
        credits: 9999,
        monthlyFreeUsed: 0,
        monthlyPremiumTrialUsed: 0,
        lastResetDate: Date.now(),
        isSchoolUser: true,
        schoolName: 'Escola Cineasta Kids'
    };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(teacherUser));
    return teacherUser;
  },

  // Novo: Cadastro de Escola
  registerSchool: (schoolName: string, teacherName: string, accessCode: string): User => {
      // Cria uma sessão nova com os dados fornecidos
      // Como não temos backend real, o "Cadastro" efetivamente loga o usuário com as configurações personalizadas
      
      const newSchoolUser: User = {
        id: `school_${Date.now()}`,
        name: `Prof. ${teacherName}`,
        email: `${teacherName.toLowerCase().replace(/\s/g, '.')}@${schoolName.toLowerCase().replace(/\s/g, '')}.edu`,
        plan: 'premium', // Escolas tem acesso full
        credits: 9999,
        monthlyFreeUsed: 0,
        monthlyPremiumTrialUsed: 0,
        lastResetDate: Date.now(),
        isSchoolUser: true,
        schoolName: schoolName
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

  // Regras de Negócio: Verificar Permissão
  canCreateStory: (user: User): { allowed: boolean; type?: 'premium' | 'free'; reason?: string } => {
    // Escolas têm acesso liberado
    if (user.isSchoolUser) return { allowed: true, type: 'premium' };

    if (user.plan === 'premium') {
      if (user.credits > 0) return { allowed: true, type: 'premium' };
      return { allowed: false, reason: 'Seus créditos de história acabaram. Adquira mais na loja!' };
    } 
    
    // Plano FREE
    if (user.monthlyPremiumTrialUsed < 1) {
        return { allowed: true, type: 'premium' }; 
    }
    
    if (user.monthlyFreeUsed < 2) {
        return { allowed: true, type: 'free' };
    }

    return { allowed: false, reason: 'Você atingiu o limite mensal (1 Premium + 2 Free). Volte mês que vem ou faça upgrade!' };
  },

  // Consumir Cota
  consumeStoryCredit: (userId: string, type: 'premium' | 'free'): User => {
    const users = getUsers();
    
    // Se for user de escola (ID começa com school_), não persistimos consumo em banco, apenas retornamos
    if (userId.startsWith('school_')) {
        const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
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

  buyPack: (userId: string): User => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) throw new Error("Usuário não encontrado");
    
    const user = users[userIndex];
    user.plan = 'premium';
    user.credits = (user.credits || 0) + 5;

    users[userIndex] = user;
    saveUsers(users);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }
};
