
export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'premium';
  credits: number; // Para plano premium (pacotes comprados)
  
  // Controle do plano FREE (Mensal)
  monthlyFreeUsed: number; // Limite: 2
  monthlyPremiumTrialUsed: number; // Limite: 1
  
  lastResetDate: number; // Para resetar o contador mensal

  // MODO ESCOLA
  isSchoolUser?: boolean; // Flag para identificar sessão de professor
  schoolName?: string; // Nome da instituição
}

export interface Avatar {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
}

export interface StoryChapter {
  title: string;
  text: string;
  visualDescription: string;
  generatedImage?: string; // Cache da imagem gerada
  generatedAudio?: string; // Cache do áudio gerado
}

export interface Story {
  id: string;
  title: string;
  theme: string;
  createdAt: number;
  chapters: StoryChapter[];
  characters: Avatar[];
  isPremium?: boolean; // Flag para identificar se foi gerada como premium
  isEducational?: boolean; // Flag para modo escola
  
  // Metadados Pedagógicos
  educationalGoal?: string;
  bnccCode?: string;
}

export enum AppStatus {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR
}

// --- MODO ESCOLA ---

export type SchoolRole = 'director' | 'vice_director' | 'teacher' | 'student';

export interface SchoolMember {
  slotId: string; // ex: 'dir', 'vice', 'prof_1', 'aluno_01'
  avatarId: string;
  role: SchoolRole;
}