
import { User, Story, Avatar, SchoolMember } from '../types';

const DB_NAME = 'CineastaDB';
const DB_VERSION = 1;

// Stores (Tabelas)
const STORE_USERS = 'users';
const STORE_STORIES = 'stories';
const STORE_AVATARS = 'avatars';
const STORE_SCHOOL_DATA = 'school_data';

export const idbService = {
  
  // Abre conexão com o banco interno do navegador
  openDB: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Criar Tabela de Usuários
        if (!db.objectStoreNames.contains(STORE_USERS)) {
          const userStore = db.createObjectStore(STORE_USERS, { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
        }

        // Criar Tabela de Histórias
        if (!db.objectStoreNames.contains(STORE_STORIES)) {
          const storyStore = db.createObjectStore(STORE_STORIES, { keyPath: 'id' });
          storyStore.createIndex('userId', 'userId', { unique: false });
        }

        // Criar Tabela de Avatares
        if (!db.objectStoreNames.contains(STORE_AVATARS)) {
          const avatarStore = db.createObjectStore(STORE_AVATARS, { keyPath: 'id' });
          avatarStore.createIndex('userId', 'userId', { unique: false });
        }
        
        // Criar Tabela de Dados Escolares
        if (!db.objectStoreNames.contains(STORE_SCHOOL_DATA)) {
            db.createObjectStore(STORE_SCHOOL_DATA, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  },

  // --- CRUD GENÉRICO ---

  add: async (storeName: string, item: any) => {
    const db = await idbService.openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(item); // Salva ou Atualiza

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  get: async (storeName: string, key: string) => {
    const db = await idbService.openDB();
    return new Promise<any>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  getAllByIndex: async (storeName: string, indexName: string, value: string) => {
    const db = await idbService.openDB();
    return new Promise<any[]>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  delete: async (storeName: string, key: string) => {
    const db = await idbService.openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Busca específica para login
  findUserByEmail: async (email: string): Promise<User | undefined> => {
    const db = await idbService.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_USERS, 'readonly');
      const store = tx.objectStore(STORE_USERS);
      const index = store.index('email');
      const request = index.get(email);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
};
