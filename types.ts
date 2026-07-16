
export interface User {
  id: string;
  name: string;
  whatsapp: string; // Alterado de email para whatsapp
  password?: string; // Adicionado para autenticação
  plan: 'free' | 'premium' | 'enterprise';
  credits: number; 
  
  monthlyFreeUsed: number;
  monthlyPremiumTrialUsed: number;
  
  lastResetDate: number;

  isSchoolUser?: boolean;
  schoolName?: string;
  schoolStoriesUsed?: number;
  maxStudents?: number;
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
  generatedImage?: string; 
  generatedAudio?: string; 
}

export interface YoutubePromo {
  titles: string[];
  description: string;
  tags: string[];
  thumbnailPrompt: string; // Detalhado para criar capa no gerador
  thumbnailIdea: string;   // Dicas de layout e headlines para o Canva
}

export interface Story {
  id: string;
  title: string;
  theme: string;
  createdAt: number;
  chapters: StoryChapter[];
  characters: Avatar[];
  isPremium?: boolean;
  isEducational?: boolean; 
  voiceName?: string;
  style?: 'kids' | 'dynamic' | 'musical';
  
  educationalGoal?: string;
  bnccCode?: string;
  youtubePromo?: YoutubePromo; // Metadados do YouTube exclusivos do administrador
  videoAspectRatio?: '16:9' | '9:16';
}

export enum AppStatus {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR
}

export type SchoolRole = 'director' | 'vice_director' | 'teacher' | 'student';

export interface SchoolMember {
  slotId: string;
  avatarId: string;
  role: SchoolRole;
}