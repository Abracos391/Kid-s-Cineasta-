export interface User {
  id: string;
  name: string;
  role: 'family' | 'educator';
  avatar?: string;
}

export interface Avatar {
  id: string;
  name: string;
  imageUrl: string;
  description: string; // Created by AI
}

export interface StoryChapter {
  title: string;
  text: string;
  visualDescription: string;
  audioUrl?: string; // User recording or AI TTS
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