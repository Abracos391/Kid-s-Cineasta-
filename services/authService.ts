
import { User } from '../types';
import { supabase } from './supabaseClient';

const TABLE_USERS = 'users';

// --- FUNÇÕES AUXILIARES ---

// Mapeia o retorno do Supabase (snake_case) para nossa interface User (camelCase)
const mapUserFromDB = (data: any): User => {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    plan: data.plan,
    credits: data.credits,
    monthlyFreeUsed: data.monthly_free_used,
    monthlyPremiumTrialUsed: data.monthly_premium_trial_used,
    lastResetDate: data.last_reset_date,
    isSchoolUser: data.is_school_user,
    schoolName: data.school_name,
    schoolStoriesUsed: data.school_stories_used,
    maxStudents: data.max_students
  };
};

export const authService = {
  
  // --- LOGIN / CADASTRO ---

  register: async (name: string, email: string, password: string): Promise<User> => {
    const cleanEmail = email.toLowerCase().trim();
    
    // Verifica se já existe
    const { data: existing } = await supabase
      .from(TABLE_USERS)
      .select('id')
      .eq('email', cleanEmail)
      .single();

    if (existing) {
      throw new Error('Este e-mail já está cadastrado.');
    }

    const newUserPayload = {
      id: crypto.randomUUID(),
      name,
      email: cleanEmail,
      plan: 'free',
      credits: 0,
      monthly_free_used: 0,
      monthly_premium_trial_used: 0,
      last_reset_date: Date.now(),
      is_school_user: false
    };

    const { error } = await supabase.from(TABLE_USERS).insert(newUserPayload);
    
    if (error) throw new Error('Erro ao criar usuário: ' + error.message);

    const user = mapUserFromDB(newUserPayload);
    localStorage.setItem('ck_current_user_id', user.id); // Salva apenas ID na sessão
    return user;
  },

  login: async (email: string, password: string): Promise<User> => {
    const cleanEmail = email.toLowerCase().trim();
    
    const { data, error } = await supabase
      .from(TABLE_USERS)
      .select('*')
      .eq('email', cleanEmail)
      .single();

    if (error || !data) {
      throw new Error('Usuário não encontrado. Verifique o e-mail.');
    }

    // Reset mensal automático (Lógica de Negócio)
    const user = mapUserFromDB(data);
    const now = new Date();
    const lastReset = new Date(user.lastResetDate);

    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
       await supabase.from(TABLE_USERS).update({
           monthly_free_used: 0,
           monthly_premium_trial_used: 0,
           last_reset_date: Date.now()
       }).eq('id', user.id);
       
       user.monthlyFreeUsed = 0;
       user.monthlyPremiumTrialUsed = 0;
    }

    localStorage.setItem('ck_current_user_id', user.id);
    return user;
  },

  // --- MODO ESCOLA ---

  loginAsTeacher: async (teacherName: string, accessCode: string): Promise<User> => {
     // Simula login de professor (Poderia ser uma tabela separada, mas vamos usar a users com flag)
     // Para simplificar a migração e manter a lógica do "Código":
     // Vamos buscar se existe um usuário escola com esse nome, se não, cria temporariamente na sessão ou busca pelo padrão de email fake
     
     if (accessCode !== "PROFESSOR123") throw new Error("Código inválido.");
     
     const fakeEmail = `school_${teacherName.toLowerCase().replace(/\s/g, '')}@cineastakids.edu`;
     
     // Tenta buscar
     const { data } = await supabase.from(TABLE_USERS).select('*').eq('email', fakeEmail).single();
     
     if (data) {
         localStorage.setItem('ck_current_user_id', data.id);
         return mapUserFromDB(data);
     } else {
         // Se não existe e usou o código certo, cria um registro novo
         return authService.registerSchool('Escola Padrão', teacherName, accessCode);
     }
  },

  registerSchool: async (schoolName: string, teacherName: string, accessCode: string): Promise<User> => {
      const fakeEmail = `${teacherName.toLowerCase().replace(/\s/g, '.')}@${schoolName.toLowerCase().replace(/\s/g, '')}.edu`;
      
      const newSchoolUser = {
        id: crypto.randomUUID(),
        name: `Prof. ${teacherName}`,
        email: fakeEmail,
        plan: 'premium',
        credits: 10,
        school_stories_used: 0,
        monthly_free_used: 0,
        monthly_premium_trial_used: 0,
        last_reset_date: Date.now(),
        is_school_user: true,
        school_name: schoolName,
        max_students: 40
      };

      const { error } = await supabase.from(TABLE_USERS).insert(newSchoolUser);
      if (error) throw new Error("Erro ao cadastrar escola: " + error.message);
      
      const user = mapUserFromDB(newSchoolUser);
      localStorage.setItem('ck_current_user_id', user.id);
      return user;
  },

  logout: () => {
    localStorage.removeItem('ck_current_user_id');
  },

  getCurrentUser: async (): Promise<User | null> => {
    const id = localStorage.getItem('ck_current_user_id');
    if (!id) return null;

    const { data, error } = await supabase.from(TABLE_USERS).select('*').eq('id', id).single();
    if (error || !data) return null;
    
    return mapUserFromDB(data);
  },

  // --- REGRAS DE NEGÓCIO ---

  canCreateStory: (user: User): { allowed: boolean; type?: 'premium' | 'free'; reason?: string } => {
    if (user.isSchoolUser) {
        if ((user.schoolStoriesUsed || 0) < 10) return { allowed: true, type: 'premium' };
        return { allowed: false, reason: 'Pacote escolar esgotado.' };
    }
    if (user.plan === 'premium') {
      if (user.credits > 0) return { allowed: true, type: 'premium' };
      return { allowed: false, reason: 'Créditos Premium esgotados.' };
    } 
    if (user.monthlyPremiumTrialUsed < 1) return { allowed: true, type: 'premium' }; 
    if (user.monthlyFreeUsed < 3) return { allowed: true, type: 'free' };

    return { allowed: false, reason: 'Limite mensal atingido.' };
  },

  consumeStoryCredit: async (userId: string, type: 'premium' | 'free'): Promise<void> => {
    const { data: user } = await supabase.from(TABLE_USERS).select('*').eq('id', userId).single();
    if (!user) return;

    const updates: any = {};

    if (user.is_school_user) {
        updates.school_stories_used = (user.school_stories_used || 0) + 1;
    } else if (user.plan === 'premium') {
        updates.credits = Math.max(0, user.credits - 1);
    } else {
        if (type === 'premium') {
            updates.monthly_premium_trial_used = (user.monthly_premium_trial_used || 0) + 1;
        } else {
            updates.monthly_free_used = (user.monthly_free_used || 0) + 1;
        }
    }

    await supabase.from(TABLE_USERS).update(updates).eq('id', userId);
  },

  buyPack: async (userId: string, packType: string): Promise<void> => {
      const { data: user } = await supabase.from(TABLE_USERS).select('*').eq('id', userId).single();
      if (!user) return;

      const updates: any = {};
      
      if (packType === 'premium_5') {
          updates.plan = 'premium';
          updates.credits = (user.credits || 0) + 5;
      } else if (packType === 'enterprise_100') {
          updates.plan = 'enterprise';
          updates.credits = (user.credits || 0) + 100;
      }

      await supabase.from(TABLE_USERS).update(updates).eq('id', userId);
  }
};
