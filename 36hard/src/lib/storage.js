// Persistence. Everything the app saves goes through this interface, so a
// cloud-sync backend can replace it later without touching the screens:
//
//   loadAll()                 -> { settings, days, workouts, checkins }
//   put(collection, id, val)  collection: 'days' | 'workouts' | 'checkins'
//   remove(collection, id)
//   putSettings(settings)
//   replaceAll(data)          used by import
//   clear(), close(), destroy()
//
// This implementation is IndexedDB, one object store per collection.

export const COLLECTIONS = ['days', 'workouts', 'checkins'];
const META = 'meta';

export const emptyData = () => ({ settings: {}, days: {}, workouts: {}, checkins: {} });

const req = (r) => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});

const done = (tx) => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error);
});

export function createStorage(name = '36hard', idb = globalThis.indexedDB) {
  let dbp = null;
  const open = () => {
    dbp ||= new Promise((resolve, reject) => {
      const r = idb.open(name, 1);
      r.onupgradeneeded = () => {
        for (const s of [META, ...COLLECTIONS]) {
          if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s);
        }
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return dbp;
  };

  async function readStore(db, store) {
    const tx = db.transaction(store, 'readonly');
    const os = tx.objectStore(store);
    const [keys, values] = await Promise.all([req(os.getAllKeys()), req(os.getAll())]);
    const out = {};
    keys.forEach((k, i) => { out[k] = values[i]; });
    return out;
  }

  async function write(stores, fn) {
    const db = await open();
    const tx = db.transaction(stores, 'readwrite');
    fn(tx);
    await done(tx);
  }

  return {
    name,
    async loadAll() {
      const db = await open();
      const data = emptyData();
      const meta = await readStore(db, META);
      data.settings = meta.settings || {};
      for (const c of COLLECTIONS) data[c] = await readStore(db, c);
      return data;
    },
    put: (collection, id, value) => write([collection], (tx) => tx.objectStore(collection).put(value, id)),
    remove: (collection, id) => write([collection], (tx) => tx.objectStore(collection).delete(id)),
    putSettings: (settings) => write([META], (tx) => tx.objectStore(META).put(settings, 'settings')),
    replaceAll: (data) => write([META, ...COLLECTIONS], (tx) => {
      tx.objectStore(META).clear();
      tx.objectStore(META).put(data.settings || {}, 'settings');
      for (const c of COLLECTIONS) {
        const os = tx.objectStore(c);
        os.clear();
        for (const [id, v] of Object.entries(data[c] || {})) os.put(v, id);
      }
    }),
    clear: () => write([META, ...COLLECTIONS], (tx) => {
      for (const s of [META, ...COLLECTIONS]) tx.objectStore(s).clear();
    }),
    async close() {
      if (dbp) (await dbp).close();
      dbp = null;
    },
    async destroy() {
      await this.close();
      // Another tab holding the database open would block deletion; don't hang on it.
      await new Promise((resolve, reject) => {
        const r = idb.deleteDatabase(name);
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
        r.onblocked = () => resolve();
      });
    },
  };
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch { /* not supported */ }
}
