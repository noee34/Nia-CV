// Sincronización en la nube: CloudAdapter contra una base de datos simulada
// con la misma semántica que la capacidad `db` (update = fusión anidada,
// update falla si el documento no existe, set reemplaza).
import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudAdapter } from '../js/store.js';

function mockDb() {
  const docs = new Map();
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn());
  const mergeDeep = (a, b) => {
    const out = { ...a };
    for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? mergeDeep(a[k], v) : v;
    return out;
  };
  const snap = (path) => ({ id: path.split('/').pop(), exists: docs.has(path), data: () => (docs.has(path) ? structuredClone(docs.get(path)) : undefined) });
  const doc = (path) => ({
    get: async () => snap(path),
    set: async (d) => { docs.set(path, structuredClone(d)); notify(); },
    update: async (d) => { if (!docs.has(path)) throw { code: 'invalid_argument' }; docs.set(path, mergeDeep(docs.get(path), structuredClone(d))); notify(); },
    delete: async () => { docs.delete(path); notify(); },
    onSnapshot: (fn) => { const l = () => fn(snap(path)); listeners.add(l); l(); return () => listeners.delete(l); },
  });
  const collection = (name) => {
    const list = () => [...docs.keys()].filter((k) => k.startsWith(name + '/')).map(snap);
    return { get: async () => ({ docs: list() }), onSnapshot: (fn) => { const l = () => fn({ docs: list() }); listeners.add(l); l(); return () => listeners.delete(l); } };
  };
  return { doc, collection, docs };
}

const at = (y, m, d, h = 10) => new Date(y, m - 1, d, h).getTime();
const B = (id, when, taken = 100) => ({ id, at: when, prepared: 150, taken, notes: '', createdAt: 1, updatedAt: 1 });

test('guardar, editar cambiando de mes y borrar', async () => {
  const db = mockDb();
  const a = new CloudAdapter(db);
  await a.open();
  await a.put('bottles', B('x', at(2026, 10, 31, 23)));
  await a.put('bottles', B('y', at(2026, 10, 30)));
  assert.ok(db.docs.has('months/2026-10'));
  await a.put('bottles', { ...B('x', at(2026, 11, 1, 0)), taken: 120 }); // movido a noviembre
  await a.open();
  assert.deepEqual((await a.getAll('bottles')).map((r) => r.id).sort(), ['x', 'y']);
  assert.equal((await a.getAll('bottles')).find((r) => r.id === 'x').taken, 120);
  assert.equal(db.docs.get('months/2026-10').bottles.x, null, 'el mes anterior queda sin el registro');
  await a.delete('bottles', 'y');
  await a.open();
  assert.deepEqual((await a.getAll('bottles')).map((r) => r.id), ['x']);
});

test('dos dispositivos escriben a la vez en el mismo mes sin pisarse', async () => {
  const db = mockDb();
  const phone = new CloudAdapter(db), tablet = new CloudAdapter(db);
  await phone.open(); await tablet.open();
  await phone.put('bottles', B('p1', at(2026, 10, 29, 8)));
  await Promise.all([
    phone.put('bottles', B('p2', at(2026, 10, 29, 9))),
    tablet.put('poops', { id: 't1', at: at(2026, 10, 29, 9), consistency: 'blanda', notes: '', createdAt: 1, updatedAt: 1 }),
    tablet.put('bottles', B('t2', at(2026, 10, 29, 11))),
  ]);
  const fresh = new CloudAdapter(db); await fresh.open();
  assert.deepEqual((await fresh.getAll('bottles')).map((r) => r.id).sort(), ['p1', 'p2', 't2']);
  assert.equal((await fresh.getAll('poops')).length, 1);
});

test('los cambios de otro dispositivo llegan en vivo', async () => {
  const db = mockDb();
  const a = new CloudAdapter(db), b = new CloudAdapter(db);
  await a.open(); await b.open();
  let seen = 0;
  b.subscribe({ onRecords: () => { seen = b.cache.bottles.length; }, onSettings: () => {} });
  await a.put('bottles', B('live', at(2026, 10, 29)));
  assert.equal(seen, 1);
  let name;
  b.subscribe({ onRecords: () => {}, onSettings: (v) => { name = v.babyName; } });
  await a.setMeta('settings', { babyName: 'Nia' });
  assert.equal(name, 'Nia');
});

test('restaurar en bloque y borrar todo', async () => {
  const db = mockDb();
  const a = new CloudAdapter(db); await a.open();
  await a.putMany('bottles', [B('1', at(2026, 9, 1)), B('2', at(2026, 10, 1)), B('3', at(2026, 10, 2))]);
  await a.put('poops', { id: 'p', at: at(2026, 10, 3), consistency: 'dura', notes: '', createdAt: 1, updatedAt: 1 });
  await a.open();
  assert.equal((await a.getAll('bottles')).length, 3);
  await a.clear('bottles');
  await a.open();
  assert.equal((await a.getAll('bottles')).length, 0);
  assert.equal((await a.getAll('poops')).length, 1, 'borrar biberones no toca las cacas');
  assert.ok(!db.docs.has('months/2026-09'), 'los meses vacíos se eliminan');
  await a.clear('poops');
  assert.equal(db.docs.size, 0);
});
