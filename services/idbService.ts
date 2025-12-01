
import { User, Story, Avatar, SchoolMember } from '../types';

const DB_NAME = 'CineastaDB';
const DB_VERSION = 5; // BUMP VERSION: Garante que todos os usuários tenham a estrutura mais recente

const STORE_USERS = 'users';
const STORE_STORIES = 'stories';
const STORE_AVATARS = 'avatars';
const STORE_SCHOOL_DATA = 'school_data';

export const idbService = {
  
  openDB: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        
        // --- USERS ---
        let userStore;
        if (!db.objectStoreNames.contains(STORE_USERS)) {
          userStore = db.createObjectStore(STORE_USERS, { keyPath: 'id' });
        } else {
          userStore = transaction?.objectStore(STORE_USERS);
        }

        if (userStore) {
            // Limpa índices antigos se existirem
            if (userStore.indexNames.contains('email')) userStore.deleteIndex('email');
            
            // Cria índice novo
            if (!userStore.indexNames.contains('whatsapp')) {
                userStore.createIndex('whatsapp', 'whatsapp', { unique: true });
            }
        }

        // --- STORIES ---
        if (!db.objectStoreNames.contains(STORE_STORIES)) {
          const storyStore = db.createObjectStore(STORE_STORIES, { keyPath: 'id' });
          storyStore.createIndex('userId', 'userId', { unique: false });
        } else {
           const storyStore = transaction?.objectStore(STORE_STORIES);
           if (storyStore && !storyStore.indexNames.contains('userId')) {
               storyStore.createIndex('userId', 'userId', { unique: false });
           }
        }

        // --- AVATARS ---
        if (!db.objectStoreNames.contains(STORE_AVATARS)) {
          const avatarStore = db.createObjectStore(STORE_AVATARS, { keyPath: 'id' });
          avatarStore.createIndex('userId', 'userId', { unique: false });
        } else {
           const avatarStore = transaction?.objectStore(STORE_AVATARS);
           if (avatarStore && !avatarStore.indexNames.contains('userId')) {
               avatarStore.createIndex('userId', 'userId', { unique: false });
           }
        }
        
        // --- SCHOOL ---
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

  add: async (storeName: string, item: any) => {
    const db = await idbService.openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(item); 

      tx.oncomplete = () => resolve(); 
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
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
      
      // Proteção contra índice inexistente
      if (!store.indexNames.contains(indexName)) {
          console.warn(`Índice ${indexName} não encontrado em ${storeName}. Retornando array vazio.`);
          resolve([]);
          return;
      }

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

      tx.oncomplete = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  findUserByWhatsapp: async (whatsapp: string): Promise<User | undefined> => {
    const db = await idbService.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_USERS, 'readonly');
      const store = tx.objectStore(STORE_USERS);
      
      if (!store.indexNames.contains('whatsapp')) {
          reject(new Error("Índice de WhatsApp não encontrado. Tente limpar os dados do navegador."));
          return;
      }

      const index = store.index('whatsapp');
      const request = index.get(whatsapp);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
};
