// Capa de datos. La app sólo habla con `store`; debajo hay un adaptador de
// almacenamiento (IndexedDB, o localStorage si IndexedDB no está disponible).
// Para añadir sincronización en el futuro basta con otro adaptador que
// implemente la misma interfaz (getAll / put / delete / clear / getMeta / setMeta)
// y use `id` + `updatedAt` para resolver conflictos (ver data-io.mergeRecords).

const DB_NAME = 'nia-cv';
const DB_VERSION = 3; // 2: álbum · 3: citas médicas
/** Todos los tipos de datos que se guardan y sincronizan. */
export const TYPES = ['bottles', 'poops', 'album', 'citas'];
/** Registros del día a día (los que exporta el CSV y borra "Borrar todos los registros"). */
export const RECORD_TYPES = ['bottles', 'poops'];

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

export class IDBAdapter {
  constructor(name = DB_NAME) { this.name = name; }
  async open() {
    this.db = await new Promise((resolve, reject) => {
      const r = indexedDB.open(this.name, DB_VERSION);
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

/**
 * Nube: base de datos del artifact de claude.ai (capacidad `db`).
 * Un documento por mes (`months/2026-10`) con mapas { bottles: {id: registro}, poops: {...} }.
 * Así una familia cabe holgadamente en los límites del almacén y cada cambio
 * sólo toca su propio registro (fusión anidada), sin pisar lo que escribe otro
 * dispositivo a la vez. Un registro borrado queda como `null` en su mes.
 */
export class CloudAdapter {
  constructor(db) {
    this.db = db;
    this.where = new Map(); // id -> mes donde está guardado
    this.cache = { bottles: [], poops: [], album: [], citas: [] };
  }
  async open() {
    this.ingest((await this.db.collection('months').get()).docs);
    this.ingestAlbum((await this.db.collection('album').get()).docs);
  }
  /** El álbum va aparte: un documento por mes del bebé (las fotos no caben juntas). */
  ingestAlbum(docs) { this.cache.album = docs.map((d) => d.data()).filter(Boolean); }
  ingest(docs) {
    const out = { bottles: [], poops: [], citas: [], album: this.cache.album || [] };
    this.where.clear();
    for (const d of docs) {
      const body = d.data() || {};
      for (const t of [...RECORD_TYPES, 'citas']) {
        for (const [id, r] of Object.entries(body[t] || {})) {
          if (r) { out[t].push(r); this.where.set(id, d.id); }
        }
      }
    }
    this.cache = out;
  }
  async getAll(t) { return this.cache[t].slice(); }
  monthOf(at) { const d = new Date(at); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
  /** Fusiona { [type]: patch } en el mes; crea el documento si aún no existe. */
  async merge(month, type, patch) {
    const ref = this.db.doc(`months/${month}`);
    try {
      await ref.update({ [type]: patch });
    } catch (e) {
      if (e?.code !== 'invalid_argument') throw e;
      const snap = await ref.get();
      if (snap.exists) throw e;
      await ref.set({ bottles: {}, poops: {}, citas: {}, [type]: patch });
    }
  }
  async put(type, rec) {
    if (type === 'album') return this.db.doc(`album/${rec.id}`).set(rec);
    const m = this.monthOf(rec.at);
    const old = this.where.get(rec.id);
    await this.merge(m, type, { [rec.id]: rec });
    if (old && old !== m) await this.merge(old, type, { [rec.id]: null });
    this.where.set(rec.id, m);
  }
  async putMany(type, recs) {
    if (type === 'album') { for (const r of recs) await this.put(type, r); return; }
    const byMonth = new Map();
    for (const r of recs) {
      const m = this.monthOf(r.at);
      if (!byMonth.has(m)) byMonth.set(m, {});
      byMonth.get(m)[r.id] = r;
    }
    for (const [m, patch] of byMonth) {
      await this.merge(m, type, patch);
      for (const id of Object.keys(patch)) this.where.set(id, m);
    }
  }
  async delete(type, id) {
    if (type === 'album') return this.db.doc(`album/${id}`).delete();
    const m = this.where.get(id);
    if (m) await this.merge(m, type, { [id]: null });
    this.where.delete(id);
  }
  async clear(type) {
    if (type === 'album') {
      for (const d of (await this.db.collection('album').get()).docs) await this.db.doc(`album/${d.id}`).delete();
      return;
    }
    const snap = await this.db.collection('months').get();
    for (const d of snap.docs) {
      const body = { ...(d.data() || {}) };
      body[type] = {};
      if (!Object.values(body.bottles || {}).some(Boolean) && !Object.values(body.poops || {}).some(Boolean) && !Object.values(body.citas || {}).some(Boolean)) await this.db.doc(`months/${d.id}`).delete();
      else await this.db.doc(`months/${d.id}`).set(body);
    }
  }
  async getMeta(key) { const s = await this.db.doc(`meta/${key}`).get(); return s.exists ? s.data().value : undefined; }
  async setMeta(key, value) { await this.db.doc(`meta/${key}`).set({ value }); }
  /** Cambios en vivo hechos desde otros dispositivos. */
  subscribe({ onRecords, onSettings, onError }) {
    this.db.collection('months').onSnapshot((snap) => { this.ingest(snap.docs); onRecords(); }, onError);
    this.db.collection('album').onSnapshot((snap) => { this.ingestAlbum(snap.docs); onRecords(); }, onError);
    this.db.doc('meta/settings').onSnapshot((s) => { if (s.exists) onSettings(s.data().value); }, onError);
  }
}

/** Memoria volátil: último recurso para que la app no se rompa (se avisa al usuario). */
export class MemoryAdapter extends LocalStorageAdapter {
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
    this.data = { bottles: [], poops: [], album: [], citas: [] };
    this.settings = { ...DEFAULT_SETTINGS };
    this.listeners = new Set();
    this.backend = 'none';
  }

  /**
   * `options.adapter` permite inyectar un adaptador ya elegido (p. ej. la
   * sincronización con Supabase tras iniciar sesión).
   */
  async init(options = {}) {
    if (options.adapter) return this.initWith(options.adapter, options.backend, options);
    // Dentro de claude.ai el diario vive en la nube y se comparte entre dispositivos.
    this.cloudExpected = typeof globalThis.claude?.use === 'function';
    let cloudDb = null;
    if (this.cloudExpected) { try { cloudDb = await globalThis.claude.use('db'); } catch { cloudDb = null; } }
    const candidates = [['indexeddb', () => new IDBAdapter()], ['localstorage', () => new LocalStorageAdapter()], ['memory', () => new MemoryAdapter()]];
    if (cloudDb) candidates.unshift(['cloud', () => new CloudAdapter(cloudDb)]);
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
    await this.load();
  }

  async initWith(adapter, backend, { account = null } = {}) {
    await adapter.open();
    this.adapter = adapter;
    this.backend = backend;
    this.account = account;
    await this.load();
  }

  async load() {
    for (const t of TYPES) this.data[t] = await this.adapter.getAll(t);
    const saved = await this.adapter.getMeta('settings');
    this.settings = { ...DEFAULT_SETTINGS, ...(saved || {}) };
    if (this.adapter.subscribe) {
      this.adapter.subscribe({
        onRecords: () => { for (const t of TYPES) this.data[t] = this.adapter.cache[t].slice(); this.emit(); },
        onSettings: (v) => { this.settings = { ...DEFAULT_SETTINGS, ...(v || {}) }; this.emit(); },
        onError: (e) => console.warn('Sincronización detenida', e),
        onStatus: () => this.emit(),
      });
    }
    // Pide al navegador que no borre los datos por falta de espacio.
    try { this.persisted = await navigator.storage?.persist?.(); } catch { this.persisted = false; }
  }

  /** Estado de la sincronización ({ online, pending, syncing, lastSync, error }) o null si no hay. */
  get sync() { return this.adapter?.state ?? null; }

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
    for (const t of RECORD_TYPES) { await this.adapter.clear(t); this.data[t] = []; }
    this.emit();
  }

  async updateSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    await this.adapter.setMeta('settings', this.settings);
    this.emit();
  }
}

export const store = new Store();
