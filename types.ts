
export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'premium';
  credits: number; // Para plano premium
  storiesCreatedThisMonth: number; // Para controle do plano free
  lastResetDate: number; // Para resetar o contador mensal
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
}

export enum AppStatus {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR
}
