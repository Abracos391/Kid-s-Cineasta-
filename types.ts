
export interface User {
  id: string;
  name: string;
  whatsapp: string; // Alterado de email para whatsapp
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

export interface Story {
  id: string;
  title: string;
  theme: string;
  createdAt: number;
  chapters: StoryChapter[];
  characters: Avatar[];
  isPremium?: boolean;
  isEducational?: boolean; 
  
  educationalGoal?: string;
  bnccCode?: string;
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
