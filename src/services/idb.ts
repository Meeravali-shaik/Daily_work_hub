/**
 * Robust IndexedDB client with fallback to localStorage
 * Covers all Daily Work Hub tables as described in Section 6 & 8 of the spec.
 */

const DB_NAME = 'daily_work_hub_db';
const DB_VERSION = 1;

const STORES = [
  'goals',
  'milestones',
  'tasks',
  'habits',
  'habit_checkins',
  'time_entries',
  'running_timer',
  'courses',
  'job_applications',
  'notes',
  'weekly_reviews',
  'reminders',
  'push_subscriptions',
  'user_settings',
  'outbox',
  'meta',
];

class IDBStorage {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private isFallback = false;

  private getDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      this.isFallback = true;
      return Promise.resolve(null);
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          for (const storeName of STORES) {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath: 'id' });
            }
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('IndexedDB open error, falling back to localStorage');
          this.isFallback = true;
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB not supported or blocked, using localStorage fallback', err);
        this.isFallback = true;
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  // --- LocalStorage Fallback Helpers ---
  private lsKey(store: string, id: string): string {
    return `dwh_${store}_${id}`;
  }

  private lsGetAll(store: string): any[] {
    const prefix = `dwh_${store}_`;
    const results: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        try {
          const val = JSON.parse(localStorage.getItem(key) || 'null');
          if (val) results.push(val);
        } catch {
          // ignore corrupted entry
        }
      }
    }
    return results;
  }

  // --- CRUD API ---
  async getAll<T = any>(store: string): Promise<T[]> {
    const db = await this.getDB();
    if (!db || this.isFallback) {
      return this.lsGetAll(store);
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve(this.lsGetAll(store));
      } catch {
        resolve(this.lsGetAll(store));
      }
    });
  }

  async get<T = any>(store: string, id: string): Promise<T | null> {
    const db = await this.getDB();
    if (!db || this.isFallback) {
      const item = localStorage.getItem(this.lsKey(store, id));
      return item ? JSON.parse(item) : null;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(id);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => {
          const item = localStorage.getItem(this.lsKey(store, id));
          resolve(item ? JSON.parse(item) : null);
        };
      } catch {
        const item = localStorage.getItem(this.lsKey(store, id));
        resolve(item ? JSON.parse(item) : null);
      }
    });
  }

  async put(store: string, row: any): Promise<void> {
    if (!row.id) {
      row.id = crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    }
    // Also save in localStorage as backup copy
    try {
      localStorage.setItem(this.lsKey(store, row.id), JSON.stringify(row));
    } catch {
      // quota or private mode
    }

    const db = await this.getDB();
    if (!db || this.isFallback) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(row);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async delete(store: string, id: string): Promise<void> {
    try {
      localStorage.removeItem(this.lsKey(store, id));
    } catch {
      // ignore
    }

    const db = await this.getDB();
    if (!db || this.isFallback) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async clearStore(store: string): Promise<void> {
    const prefix = `dwh_${store}_`;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);

    const db = await this.getDB();
    if (!db || this.isFallback) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async getMeta(key: string): Promise<any> {
    const row = await this.get('meta', key);
    return row ? row.value : null;
  }

  async setMeta(key: string, value: any): Promise<void> {
    await this.put('meta', { id: key, value, updated_at: new Date().toISOString() });
  }
}

export const idb = new IDBStorage();
