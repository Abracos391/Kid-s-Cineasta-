
import { Avatar, Story, SchoolMember } from '../types';
import { idbService } from './idbService';

export const dbService = {
  
  // --- AVATARES ---

  saveAvatar: async (userId: string, avatar: Avatar) => {
    await idbService.add('avatars', { ...avatar, userId });
  },

  getUserAvatars: async (userId: string): Promise<Avatar[]> => {
    return await idbService.getAllByIndex('avatars', 'userId', userId);
  },

  deleteAvatar: async (userId: string, avatarId: string) => {
    await idbService.delete('avatars', avatarId);
  },

  // --- HISTÓRIAS ---

  saveStory: async (userId: string, story: Story) => {
    // Salva a história completa (com texto, audio e imagem) no banco interno
    await idbService.add('stories', { ...story, userId });
  },

  getUserStories: async (userId: string): Promise<Story[]> => {
    return await idbService.getAllByIndex('stories', 'userId', userId);
  },

  getStoryById: async (userId: string, storyId: string): Promise<Story | null> => {
      const story = await idbService.get('stories', storyId);
      if (story && story.userId === userId) return story;
      return null;
  },

  updateStory: async (userId: string, story: Story) => {
      await idbService.add('stories', { ...story, userId });
  },

  deleteStory: async (userId: string, storyId: string) => {
    await idbService.delete('stories', storyId);
  },

  // --- ESCOLA ---

  getSchoolRoster: async (userId: string): Promise<SchoolMember[]> => {
      const data = await idbService.get('school_data', `roster_${userId}`);
      return data ? data.members : [];
  },

  saveSchoolRoster: async (userId: string, members: SchoolMember[]) => {
      await idbService.add('school_data', { id: `roster_${userId}`, members });
  }
};
