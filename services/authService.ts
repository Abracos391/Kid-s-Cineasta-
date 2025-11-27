
import { User } from '../types';
import { supabase } from './supabaseClient';

const TABLE_USERS = 'users';

// --- FUNÇÕES AUXILIARES ---

// Mapeia o retorno do Supabase (snake_case) para nossa interface User (camelCase)
const mapUserFromDB = (data: any): User => {
  if (!data) return null as any;
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
    
    console.log("Tentando cadastrar:", cleanEmail);

    // 1. Verifica se já existe
    const { data: existing, error: checkError } = await supabase
      .from(TABLE_USERS)
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (checkError) {
        console.error("Erro ao verificar email:", checkError);
        throw new Error("Erro de conexão com o banco de dados.");
    }

    if (existing) {
      throw new Error('Este e-mail já está cadastrado. Tente fazer login.');
    }

    // 2. Tenta Criar
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
    
    if (error) {
        console.error("Erro Supabase Insert:", error);
        // Tratamento específico para erro de permissão (RLS)
        if (error.code === '42501' || error.message.includes('row-level security')) {
            throw new Error('BLOQUEIO DE SEGURANÇA: Rode o script supabase_setup.sql no painel do Supabase para liberar o cadastro.');
        }
        throw new Error('Falha no cadastro: ' + error.message);
    }

    const user = mapUserFromDB(newUserPayload);
    localStorage.setItem('ck_current_user_id', user.id); 
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
      console.error("Erro Login:", error);
      throw new Error('Usuário não encontrado ou erro de conexão.');
    }

    // Reset mensal automático (Lógica de Negócio)
    const user = mapUserFromDB(data);
    const now = new Date();
    const lastReset = user.lastResetDate ? new Date(user.lastResetDate) : new Date(0);

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
     if (accessCode !== "PROFESSOR123") throw new Error("Código de acesso inválido.");
     
     const fakeEmail = `school_${teacherName.toLowerCase().replace(/\s/g, '')}@cineastakids.edu`;
     
     const { data, error } = await supabase.from(TABLE_USERS).select('*').eq('email', fakeEmail).maybeSingle();
     
     if (error) {
         console.error("Erro Login Professor:", error);
         throw new Error("Erro ao conectar com a escola.");
     }
     
     if (data) {
         localStorage.setItem('ck_current_user_id', data.id);
         return mapUserFromDB(data);
     } else {
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
      if (error) {
          console.error("Erro Cadastro Escola:", error);
          if (error.code === '42501' || error.message.includes('row-level security')) {
            throw new Error('BLOQUEIO: Rode o script supabase_setup.sql no Supabase.');
          }
          throw new Error("Erro ao cadastrar escola: " + error.message);
      }
      
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
    if (error || !data) {
        if(error) console.warn("Sessão inválida ou expirada:", error.message);
        return null;
    }
    
    return mapUserFromDB(data);
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
    } else if (user.plan === 'premium' || user.plan === 'enterprise') {
        updates.credits = Math.max(0, user.credits - 1);
    } else {
        if (type === 'premium') {
            updates.monthly_premium_trial_used = (user.monthly_premium_trial_used || 0) + 1;
        } else {
            updates.monthly_free_used = (user.monthly_free_used || 0) + 1;
        }
    }

    const { error } = await supabase.from(TABLE_USERS).update(updates).eq('id', userId);
    if(error) console.error("Erro ao consumir crédito:", error);
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

      const { error } = await supabase.from(TABLE_USERS).update(updates).eq('id', userId);
      if(error) console.error("Erro ao processar compra:", error);
  }
};
