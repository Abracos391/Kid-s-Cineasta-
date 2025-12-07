
import { User, Story, Avatar, SchoolMember } from '../types';

const DB_NAME = 'CineastaDB';
const DB_VERSION = 7; // VERSÃO 7: Garante reestruturação e índices robustos

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
            // Garante que o índice whatsapp exista e remove antigos conflitantes
            if (userStore.indexNames.contains('email')) userStore.deleteIndex('email');
            
            // Recria o índice para garantir integridade na V7
            if (userStore.indexNames.contains('whatsapp')) {
                userStore.deleteIndex('whatsapp');
            }
            userStore.createIndex('whatsapp', 'whatsapp', { unique: true });
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
        console.error("Erro crítico ao abrir DB:", (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  },

  add: async (storeName: string, item: any) => {
    try {
        const db = await idbService.openDB();
        return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(item); 

        tx.oncomplete = () => resolve(); 
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error(`Erro ao salvar em ${storeName}:`, e);
        throw e;
    }
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

  // FUNÇÃO ROBUSTA DE BUSCA DE USUÁRIO (Indexada + Varredura de Segurança)
  findUserByWhatsapp: async (whatsapp: string): Promise<User | undefined> => {
    const db = await idbService.openDB();
    
    // Tentativa 1: Busca rápida pelo Índice
    try {
        const user = await new Promise<User | undefined>((resolve, reject) => {
            const tx = db.transaction(STORE_USERS, 'readonly');
            const store = tx.objectStore(STORE_USERS);
            
            if (!store.indexNames.contains('whatsapp')) {
                resolve(undefined); // Índice não existe, vai para o fallback
                return;
            }

            const index = store.index('whatsapp');
            const request = index.get(whatsapp);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(undefined); 
        });

        if (user) return user;

    } catch (e) {
        console.warn("Falha na busca indexada, tentando varredura manual...", e);
    }

    // Tentativa 2: Fallback (Varredura manual) - Garante que acha se existir no banco
    // Isso resolve o problema de login falhar mesmo com usuário cadastrado
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_USERS, 'readonly');
        const store = tx.objectStore(STORE_USERS);
        const request = store.openCursor();

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
                const u = cursor.value as User;
                // Compara removendo caracteres não numéricos por segurança
                const dbPhone = u.whatsapp.replace(/\D/g, '');
                const searchPhone = whatsapp.replace(/\D/g, '');
                
                if (dbPhone === searchPhone) {
                    resolve(u); // ACHOU!
                    return;
                }
                cursor.continue();
            } else {
                resolve(undefined); // Realmente não existe
            }
        };
        request.onerror = () => reject(request.error);
    });
  }
};
