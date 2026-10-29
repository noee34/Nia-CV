// Capa de datos. La app sólo habla con `store`; debajo hay un adaptador de
// almacenamiento (IndexedDB, o localStorage si IndexedDB no está disponible).
// Para añadir sincronización en el futuro basta con otro adaptador que
// implemente la misma interfaz (getAll / put / delete / clear / getMeta / setMeta)
// y use `id` + `updatedAt` para resolver conflictos (ver data-io.mergeRecords).

const DB_NAME = 'nia-cv';
const DB_VERSION = 1;
export const TYPES = ['bottles', 'poops'];

export const DEFAULT_SETTINGS = {
  babyName: 'Nia',
  quickAmounts: [30, 60, 90, 120, 150, 180, 210, 240],
  nextIntervalMin: 0, // 0 = sin referencia de próximo biberón
  lastPrepared: null,
};

function req(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

class IDBAdapter {
  async open() {
    this.db = await new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = () => {
        const db = r.result;
        for (const t of TYPES) {
          if (!db.objectStoreNames.contains(t)) db.createObjectStore(t, { keyPath: 'id' }).createIndex('at', 'at');
        }
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error('blocked'));
    });
  }
  tx(name, mode = 'readonly') { return this.db.transaction(name, mode).objectStore(name); }
  done(store) {
    return new Promise((resolve, reject) => {
      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = () => reject(store.transaction.error);
      store.transaction.onabort = () => reject(store.transaction.error || new Error('abort'));
    });
  }
  getAll(type) { return req(this.tx(type).getAll()); }
  async put(type, rec) { const s = this.tx(type, 'readwrite'); s.put(rec); await this.done(s); }
  async putMany(type, recs) { const s = this.tx(type, 'readwrite'); recs.forEach((r) => s.put(r)); await this.done(s); }
  async delete(type, id) { const s = this.tx(type, 'readwrite'); s.delete(id); await this.done(s); }
  async clear(type) { const s = this.tx(type, 'readwrite'); s.clear(); await this.done(s); }
  getMeta(key) { return req(this.tx('meta').get(key)); }
  async setMeta(key, value) { const s = this.tx('meta', 'readwrite'); s.put(value, key); await this.done(s); }
}

class LocalStorageAdapter {
  key(t) { return `nia-cv:${t}`; }
  read(t) { try { return JSON.parse(localStorage.getItem(this.key(t)) || '{}'); } catch { return {}; } }
  write(t, obj) { localStorage.setItem(this.key(t), JSON.stringify(obj)); }
  async open() { localStorage.setItem('nia-cv:probe', '1'); localStorage.removeItem('nia-cv:probe'); }
  async getAll(t) { return Object.values(this.read(t)); }
  async put(t, rec) { const o = this.read(t); o[rec.id] = rec; this.write(t, o); }
  async putMany(t, recs) { const o = this.read(t); recs.forEach((r) => { o[r.id] = r; }); this.write(t, o); }
  async delete(t, id) { const o = this.read(t); delete o[id]; this.write(t, o); }
  async clear(t) { this.write(t, {}); }
  async getMeta(k) { return this.read('meta')[k]; }
  async setMeta(k, v) { const o = this.read('meta'); o[k] = v; this.write('meta', o); }
}

/** Memoria volátil: último recurso para que la app no se rompa (se avisa al usuario). */
class MemoryAdapter extends LocalStorageAdapter {
  constructor() { super(); this.mem = {}; }
  read(t) { return this.mem[t] || {}; }
  write(t, o) { this.mem[t] = o; }
  async open() {}
}

export function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

class Store {
  constructor() {
    this.data = { bottles: [], poops: [] };
    this.settings = { ...DEFAULT_SETTINGS };
    this.listeners = new Set();
    this.backend = 'none';
  }

  async init() {
    const candidates = [['indexeddb', () => new IDBAdapter()], ['localstorage', () => new LocalStorageAdapter()], ['memory', () => new MemoryAdapter()]];
    for (const [name, make] of candidates) {
      try {
        if (name === 'indexeddb' && !('indexedDB' in globalThis)) continue;
        const a = make();
        await a.open();
        this.adapter = a;
        this.backend = name;
        break;
      } catch (e) { console.warn('Almacenamiento no disponible:', name, e); }
    }
    for (const t of TYPES) this.data[t] = await this.adapter.getAll(t);
    const saved = await this.adapter.getMeta('settings');
    this.settings = { ...DEFAULT_SETTINGS, ...(saved || {}) };
    // Pide al navegador que no borre los datos por falta de espacio.
    try { this.persisted = await navigator.storage?.persist?.(); } catch { this.persisted = false; }
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { this.listeners.forEach((fn) => fn()); }

  all(type) { return this.data[type]; }
  get(type, id) { return this.data[type].find((r) => r.id === id); }

  /** Crea o actualiza (si trae id existente). Nunca duplica. */
  async save(type, fields) {
    const now = Date.now();
    const existing = fields.id && this.get(type, fields.id);
    const rec = existing
      ? { ...existing, ...fields, updatedAt: now }
      : { ...fields, id: uuid(), createdAt: now, updatedAt: now };
    await this.adapter.put(type, rec);
    const list = this.data[type];
    const i = list.findIndex((r) => r.id === rec.id);
    if (i >= 0) list[i] = rec; else list.push(rec);
    this.emit();
    return rec;
  }

  async remove(type, id) {
    await this.adapter.delete(type, id);
    this.data[type] = this.data[type].filter((r) => r.id !== id);
    this.emit();
  }

  async replaceAll(type, recs) {
    await this.adapter.clear(type);
    await this.adapter.putMany(type, recs);
    this.data[type] = [...recs];
  }

  async clearAll() {
    for (const t of TYPES) { await this.adapter.clear(t); this.data[t] = []; }
    this.emit();
  }

  async updateSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    await this.adapter.setMeta('settings', this.settings);
    this.emit();
  }
}

export const store = new Store();
