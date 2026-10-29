// Prueba de extremo a extremo del modo cuenta (usuario y contraseña + nube).
// Supabase se sustituye por un servidor simulado en Node, compartido por dos
// "dispositivos" (dos navegadores independientes). Requiere `npm start`.
// Uso: node tests/e2e-cloud.mjs [carpeta-capturas]
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const URL = process.env.APP_URL || 'http://localhost:5173/';
const shots = process.argv[2] || 'docs/screenshots';
await mkdir(shots, { recursive: true });

/* ---------- Servidor simulado (auth + tablas con "RLS") ---------- */
const users = new Map(); // email -> { id, password }
const tables = { biberones: [], deposiciones: [], ajustes: [], album: [] };
const pages = new Set();
const members = new Map(); // miembro -> propietario (familias)
const invites = new Map(); // código -> { owner, expires, usedBy }
const emailOf = (id) => [...users].find(([, u]) => u.id === id)?.[0] || '';
const familyOf = (id) => members.get(id) || id; // igual que privado.mi_familia()
const allowed = (token, owner) => owner === token || owner === familyOf(token); // reglas "su familia"

let serverDown = false; // simula que la nube no responde

async function rpc(token, call) {
  if (serverDown) return { data: null, error: { message: 'Failed to fetch' } };
  const { kind } = call;
  if (kind === 'signUp') {
    if (users.has(call.email)) return { error: { message: 'User already registered' } };
    const id = `u-${users.size + 1}`;
    users.set(call.email, { id, password: call.password });
    return { data: { session: { access_token: id, user: { id, email: call.email } } } };
  }
  if (kind === 'signIn') {
    const u = users.get(call.email);
    if (!u || u.password !== call.password) return { error: { message: 'Invalid login credentials' } };
    return { data: { session: { access_token: u.id, user: { id: u.id, email: call.email } } } };
  }
  if (!token) return { error: { message: 'JWT expired' } };
  if (kind === 'rpc') {
    const fail = (message) => ({ data: null, error: { message } });
    if (call.name === 'mi_familia_info') {
      const owner = familyOf(token);
      return { data: { propietario: owner, propietario_correo: emailOf(owner), miembros: [...members].filter(([, o]) => o === owner).map(([m]) => ({ id: m, correo: emailOf(m) })) }, error: null };
    }
    if (call.name === 'crear_invitacion') {
      if (members.has(token)) return fail('Solo la persona que creó el diario puede invitar.');
      const code = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, 'X');
      invites.set(code, { owner: token, expires: Date.now() + 48 * 3600e3, usedBy: null });
      return { data: { codigo: code, caduca: new Date(Date.now() + 48 * 3600e3).toISOString() }, error: null };
    }
    if (call.name === 'unirse_a_familia') {
      const inv = invites.get(String(call.args.p_codigo).toUpperCase());
      if (!inv || inv.usedBy || inv.expires < Date.now()) return fail('El código no es válido o ha caducado. Pide uno nuevo.');
      if (inv.owner === token) return fail('Ese código es tuyo: compártelo con tu pareja.');
      members.set(token, inv.owner); inv.usedBy = token;
      return { data: inv.owner, error: null };
    }
    if (call.name === 'salir_de_familia') { members.delete(token); return { data: null, error: null }; }
    if (call.name === 'quitar_de_familia') { if (members.get(call.args.p_miembro) === token) members.delete(call.args.p_miembro); return { data: null, error: null }; }
    return fail('función desconocida');
  }
  const t = tables[call.table];
  const visible = () => t.filter((r) => allowed(token, r.usuario_id) && call.filters.every(([f, v]) => String(r[f]) === String(v)));
  let changed = false;
  let data = null;
  if (call.action === 'select') {
    let rows = visible().sort((a, b) => (a.fecha_hora ?? 0) - (b.fecha_hora ?? 0) || String(a.id).localeCompare(String(b.id)));
    if (call.range) rows = rows.slice(call.range[0], call.range[1] + 1);
    data = call.single ? (rows[0] ?? null) : rows;
  } else if (call.action === 'upsert') {
    for (const row of call.rows) {
      if (!allowed(token, row.usuario_id)) return { error: { message: 'new row violates row-level security policy' } };
      const key = call.table === 'ajustes' ? 'usuario_id' : 'id';
      const i = t.findIndex((r) => r[key] === row[key]);
      if (i >= 0) t[i] = { ...row }; else t.push({ ...row });
    }
    changed = true;
  } else if (call.action === 'delete') {
    const gone = new Set(visible());
    tables[call.table] = t.filter((r) => !gone.has(r));
    changed = true;
  }
  if (changed) for (const p of pages) p.evaluate(() => window.__mockNotify?.()).catch(() => {});
  return { data, error: null };
}

/* ---------- Cliente simulado que se inyecta en lugar de supabase-js ---------- */
const mockClient = `
window.supabase = { createClient(url, key, opts) {
  const KEY = 'mock-session';
  // Igual que supabase-js: la sesión se guarda en el almacenamiento que indique la app.
  const store = opts?.auth?.storage || localStorage;
  const read = () => { try { return JSON.parse(store.getItem(KEY)); } catch { return null; } };
  const call = async (c) => {
    if (!navigator.onLine) return { data: null, error: { message: 'Failed to fetch' } };
    return window.__mockRpc(read()?.access_token || null, c);
  };
  const authListeners = [];
  const auth = {
    async getSession() { return { data: { session: read() }, error: null }; },
    async signInWithPassword({ email, password }) { const r = await call({ kind: 'signIn', email, password }); if (r.data) store.setItem(KEY, JSON.stringify(r.data.session)); return r.data ? r : { data: {}, error: r.error }; },
    async signUp({ email, password }) { const r = await call({ kind: 'signUp', email, password }); if (r.data) store.setItem(KEY, JSON.stringify(r.data.session)); return r.data ? r : { data: {}, error: r.error }; },
    async resetPasswordForEmail() { return { error: null }; },
    async updateUser() { return { data: {}, error: null }; },
    async signOut() { store.removeItem(KEY); return { error: null }; },
    async setSession(sess) { store.setItem(KEY, JSON.stringify(sess)); return { data: { session: sess }, error: null }; },
    onAuthStateChange(cb) { authListeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
  };
  const from = (table) => {
    const q = { table, action: 'select', filters: [], range: null, single: false };
    const b = {
      select() { return b; }, order() { return b; },
      range(a, z) { q.range = [a, z]; return b; },
      eq(f, v) { q.filters.push([f, v]); return b; },
      maybeSingle() { q.single = true; return b; },
      upsert(rows) { q.action = 'upsert'; q.rows = Array.isArray(rows) ? rows : [rows]; return b; },
      delete() { q.action = 'delete'; return b; },
      then(res, rej) { return call(q).then(res, rej); },
    };
    return b;
  };
  window.__mockChannels = [];
  window.__mockNotify = () => window.__mockChannels.forEach((fn) => fn({}));
  const channel = () => { const ch = { on(_t, _f, cb) { window.__mockChannels.push(cb); return ch; }, subscribe() { return ch; } }; return ch; };
  const rpc = (name, args) => call({ kind: 'rpc', name, args });
  return { auth, from, channel, rpc, removeChannel() {} };
} };`;

const browser = await chromium.launch();
const errors = [];
async function newDevice(name) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES', timezoneId: 'Europe/Madrid', serviceWorkers: 'block' });
  await ctx.exposeFunction('__mockRpc', rpc);
  await ctx.route('**/js/vendor/supabase.js', (r) => r.fulfill({ contentType: 'text/javascript', body: mockClient }));
  await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const SUPABASE_URL = 'https://demo.supabase.co'; export const SUPABASE_ANON_KEY = 'anon';" }));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  pages.add(page);
  return { ctx, page };
}
const step = (m) => console.log('✓', m);
const waitText = (page, sel, re) => page.waitForFunction(([s, src]) => new RegExp(src, 'i').test(document.querySelector(s)?.innerText || ''), [sel, re.source], { timeout: 8000 });

const A = await newDevice('móvil');
const pa = A.page;
await pa.goto(URL);
await pa.locator('#auth form').waitFor();
assert.equal(await pa.locator('#tabbar').isHidden(), true);
await pa.screenshot({ path: `${shots}/cuenta-01-entrar.png` });
step('Sin sesión se muestra la pantalla de acceso (sin pestañas)');

await pa.fill('#auth-email', 'familia@example.com');
await pa.fill('#auth-password', 'incorrecta');
await pa.getByRole('button', { name: 'Entrar' }).tap();
await waitText(pa, '#auth .form-error', /Correo o contraseña incorrectos/);
step('Credenciales incorrectas → mensaje claro');

await pa.getByRole('button', { name: 'Crear una cuenta nueva' }).tap();
await pa.fill('#auth-email', 'familia@example.com');
await pa.fill('#auth-password', 'corto');
await pa.fill('#auth-repeat', 'corto');
await pa.getByRole('button', { name: 'Crear cuenta' }).tap();
await waitText(pa, '#auth .form-error', /al menos 8/);
await pa.fill('#auth-password', 'NiaCuidados2026');
await pa.fill('#auth-repeat', 'NiaCuidados2025');
await pa.getByRole('button', { name: 'Crear cuenta' }).tap();
await waitText(pa, '#auth .form-error', /no coinciden/);
await pa.fill('#auth-repeat', 'NiaCuidados2026');
await pa.screenshot({ path: `${shots}/cuenta-02-crear.png` });
await pa.getByRole('button', { name: 'Crear cuenta' }).tap();
await pa.locator('.h-display').waitFor();
await waitText(pa, '.sync-pill', /En la nube/);
step('Cuenta creada (validaciones de contraseña) y diario abierto');

await pa.getByRole('button', { name: 'Añadir biberón' }).tap();
await pa.locator('[data-quick="120"]').tap();
await pa.getByRole('button', { name: 'Guardar biberón' }).tap();
await pa.locator('.sheet-root').waitFor({ state: 'detached' });
await pa.waitForFunction(() => true);
await new Promise((r) => setTimeout(r, 400));
assert.equal(tables.biberones.length, 1);
assert.equal(tables.biberones[0].tomado_ml, 120);
assert.equal(tables.biberones[0].usuario_id, 'u-1');
await waitText(pa, '.sync-pill', /En la nube/);
await pa.screenshot({ path: `${shots}/cuenta-03-hoy.png` });
step('Biberón guardado en la nube con el usuario correcto');

// Segundo dispositivo
const B = await newDevice('tablet');
const pb = B.page;
await pb.goto(URL);
await pb.locator('#auth form').waitFor();
await pb.fill('#auth-email', 'familia@example.com');
await pb.fill('#auth-password', 'NiaCuidados2026');
await pb.getByRole('button', { name: 'Entrar' }).tap();
await waitText(pb, '#view-hoy .card', /120 ml registrados/);
step('Otro dispositivo entra con el mismo usuario y ve el biberón');

await pb.getByRole('button', { name: 'Registrar caca' }).tap();
await pb.locator('[data-cons="normal"]').tap();
await pb.getByRole('button', { name: 'Guardar deposición' }).tap();
await waitText(pa, '#view-hoy', /1\s*deposición hoy/);
step('Lo registrado en la tablet aparece en vivo en el móvil');

// Sin conexión en el móvil
await A.ctx.setOffline(true);
await pa.getByRole('button', { name: 'Añadir biberón' }).tap();
await pa.locator('[data-quick="90"]').tap();
await pa.getByRole('button', { name: 'Guardar biberón' }).tap();
await waitText(pa, '.sync-pill', /Sin conexión · 1 por subir/);
assert.equal(tables.biberones.length, 1, 'todavía no ha llegado a la nube');
assert.match(await pa.locator('#view-hoy .card').first().innerText(), /210 ml registrados/);
await pa.screenshot({ path: `${shots}/cuenta-04-sin-conexion.png` });
step('Sin conexión: se ve al momento y queda pendiente de subir');

// Cerrar y abrir la app mientras la nube sigue sin responder: lo pendiente sigue ahí
serverDown = true;
await A.ctx.setOffline(false);
await pa.reload();
await pa.locator('.h-display').waitFor();
await waitText(pa, '.sync-pill', /1 por subir/);
assert.match(await pa.locator('#view-hoy .card').first().innerText(), /210 ml registrados/);
assert.equal(tables.biberones.length, 1);
step('Tras cerrar y abrir la app, lo pendiente sigue guardado en el dispositivo');
serverDown = false;
await pa.evaluate(() => dispatchEvent(new Event('online')));
await waitText(pa, '.sync-pill', /En la nube/);
assert.equal(tables.biberones.length, 2);
await waitText(pb, '#view-hoy .card', /210 ml registrados/);
step('Al volver la conexión se sube solo y llega al otro dispositivo');

// Editar en un dispositivo, borrar en otro
await pb.locator('.timeline [data-edit="bottles"]').first().tap();
await pb.getByRole('button', { name: 'Eliminar biberón' }).tap();
await pb.locator('.dialog').getByRole('button', { name: 'Eliminar' }).tap();
await waitText(pa, '#view-hoy .card', /1\s*toma/);
assert.equal(tables.biberones.length, 1);
step('Un borrado en la tablet desaparece también del móvil');

// La cuenta aparece en Ajustes
await pa.getByRole('button', { name: 'Ajustes' }).tap();
assert.match(await pa.locator('.sheet').innerText(), /familia@example\.com/);
await pa.screenshot({ path: `${shots}/cuenta-05-ajustes.png` });
await pa.getByRole('button', { name: 'Cerrar' }).first().tap();
await pa.locator('.sheet-root').waitFor({ state: 'detached' });

// Datos personales (pestaña Nia) se sincronizan
await pa.getByRole('tab', { name: 'Nia' }).tap();
await pa.getByRole('button', { name: 'Editar datos de Nia' }).tap();
await pa.fill('input[name="name"]', 'Nia Carmen');
await pa.getByRole('radio', { name: '0+' }).tap();
await pa.getByRole('button', { name: 'Guardar datos' }).tap();
await pa.locator('.sheet-root').waitFor({ state: 'detached' });
await waitText(pb, '.h-display', /Nia Carmen, hoy/);
assert.equal(tables.ajustes[0].valor.bloodType, '0+');
step('Los datos personales (nombre y grupo sanguíneo) se sincronizan');

// Álbum: lo guardado en el móvil llega a la tablet
await pa.locator('[data-album="0"]').tap();
await pa.fill('textarea[name="notes"]', 'Bienvenida al mundo');
await pa.getByRole('button', { name: 'Guardar en el álbum' }).tap();
await pa.locator('.sheet-root').waitFor({ state: 'detached' });
await waitText(pa, '#view-nia [data-album="0"]', /Nacimiento/);
assert.equal(tables.album.length, 1);
assert.equal(tables.album[0].nota, 'Bienvenida al mundo');
assert.equal(tables.album[0].mes, 0);
await pb.getByRole('tab', { name: 'Nia' }).tap();
await pb.waitForFunction(async () => (await import('/js/store.js')).store.all('album').length === 1, null, { timeout: 8000 });
await pa.getByRole('tab', { name: 'Hoy' }).tap();
await pb.getByRole('tab', { name: 'Hoy' }).tap();
step('El álbum se guarda en la nube y llega al otro dispositivo');

// ---------- Familia: la pareja entra con SU cuenta al mismo diario ----------
await pa.getByRole('button', { name: 'Ajustes' }).tap();
await pa.locator('[data-invite]').tap();
await pa.locator('.invite-code').waitFor();
const code = (await pa.locator('.invite-code').innerText()).trim();
assert.match(code, /^[A-Z0-9]{6}$/);
await pa.screenshot({ path: `${shots}/cuenta-06-invitar.png` });
await pa.getByRole('button', { name: 'Cerrar' }).last().tap();
await pa.getByRole('button', { name: 'Cerrar' }).first().tap();
await pa.locator('.sheet-root').first().waitFor({ state: 'detached' });
step(`La propietaria crea un código de invitación (${code})`);

const C = await newDevice('móvil de la pareja');
const pc = C.page;
await pc.goto(URL);
await pc.locator('#auth form').waitFor();
await pc.getByRole('button', { name: '¿Te han invitado? Crea tu cuenta con el código' }).tap();
await pc.fill('#auth-email', 'pareja@example.com');
await pc.fill('#auth-password', 'NuestraNia2026');
await pc.fill('#auth-repeat', 'NuestraNia2026');
await pc.fill('#auth-invite', code.toLowerCase());
assert.equal(await pc.locator('input[name="remember"]').isChecked(), true, '“Mantener la sesión” viene marcado');
await pc.screenshot({ path: `${shots}/cuenta-07-pareja.png` });
await pc.getByRole('button', { name: 'Crear cuenta' }).tap();
await waitText(pc, '.h-display', /Nia Carmen, hoy/);
await waitText(pc, '#view-hoy .card', /1\s*toma/);
step('La pareja crea su propia cuenta con el código y ve el mismo diario');

await pc.getByRole('button', { name: 'Registrar caca' }).tap();
await pc.locator('[data-cons="blanda"]').tap();
await pc.getByRole('button', { name: 'Guardar deposición' }).tap();
await waitText(pa, '#view-hoy', /2\s*deposiciones hoy/);
const lastPoop = tables.deposiciones.at(-1);
assert.equal(lastPoop.usuario_id, 'u-1', 'lo apuntado por la pareja va al diario de la propietaria');
step('Lo que apunta la pareja llega en vivo al móvil de la propietaria');

await pa.getByRole('button', { name: 'Ajustes' }).tap();
await waitText(pa, '.sheet', /pareja@example\.com/);
await pa.getByRole('button', { name: 'Cerrar' }).first().tap();
await pa.locator('.sheet-root').waitFor({ state: 'detached' });
await pc.getByRole('button', { name: 'Ajustes' }).tap();
await waitText(pc, '.sheet', /Compartes el diario de[\s\S]*familia@example\.com/);
assert.equal(await pc.locator('[data-invite]').count(), 0, 'la pareja no puede invitar a otros');
await pc.screenshot({ path: `${shots}/cuenta-08-familia.png` });
await pc.getByRole('button', { name: 'Cerrar' }).first().tap();
await pc.locator('.sheet-root').waitFor({ state: 'detached' });
step('Ajustes muestra quién comparte el diario en cada cuenta');

// Un código ya usado no sirve
const D = await newDevice('otro móvil');
const pd = D.page;
await pd.goto(URL);
await pd.locator('#auth form').waitFor();
await pd.getByRole('button', { name: 'Crear una cuenta nueva' }).tap();
await pd.fill('#auth-email', 'curioso@example.com');
await pd.fill('#auth-password', 'Curioso2026!');
await pd.fill('#auth-repeat', 'Curioso2026!');
await pd.fill('#auth-invite', code);
await pd.getByRole('button', { name: 'Crear cuenta' }).tap();
await pd.locator('.toast').filter({ hasText: /no es válido o ha caducado/ }).waitFor();
await waitText(pd, '#view-hoy .card', /0\s*tomas/);
step('Un código ya usado no da acceso (esa cuenta ve solo su diario vacío)');

// Mantener la sesión iniciada: con la casilla, al cerrar y abrir la app sigue dentro
const pc2 = await C.ctx.newPage();
pages.add(pc2);
await pc2.goto(URL);
await waitText(pc2, '.h-display', /Nia Carmen, hoy/);
await pc2.close(); pages.delete(pc2);
step('Con “Mantener la sesión iniciada”, al volver a abrir la app sigue dentro');

// Sin la casilla: al cerrar y abrir la app pide entrar otra vez
await pd.getByRole('button', { name: 'Ajustes' }).tap();
await pd.getByRole('button', { name: 'Cerrar sesión' }).tap();
await pd.locator('#auth form').waitFor();
await pd.fill('#auth-email', 'curioso@example.com');
await pd.fill('#auth-password', 'Curioso2026!');
await pd.locator('input[name="remember"]').uncheck();
await pd.getByRole('button', { name: 'Entrar' }).tap();
await waitText(pd, '#view-hoy .card', /0\s*tomas/);
const pd2 = await D.ctx.newPage(); // abrir la app de nuevo (sesión temporal borrada)
pages.add(pd2);
await pd2.goto(URL);
await pd2.locator('#auth form').waitFor();
await pd2.close(); pages.delete(pd2);
step('Sin la casilla, al volver a abrir la app pide entrar de nuevo');

// La propietaria quita el acceso
await pa.getByRole('button', { name: 'Ajustes' }).tap();
await pa.locator('[data-remove-member]').tap();
await pa.locator('.dialog').getByRole('button', { name: 'Quitar acceso' }).tap();
await pa.locator('.toast').filter({ hasText: 'Acceso quitado' }).waitFor();
await pa.getByRole('button', { name: 'Cerrar' }).first().tap();
await pa.locator('.sheet-root').waitFor({ state: 'detached' });
await pc.reload();
await waitText(pc, '#view-hoy .card', /0\s*tomas/);
step('Al quitarle el acceso, la pareja deja de ver el diario');

// Cerrar sesión
await pb.getByRole('button', { name: 'Ajustes' }).tap();
await pb.getByRole('button', { name: 'Cerrar sesión' }).tap();
await pb.locator('#auth form').waitFor();
const leftover = await pb.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
assert.ok(!leftover.includes('nia-cv-u-1'), 'la copia local se borra al salir');
step('Cerrar sesión vuelve al acceso y borra la copia del dispositivo');

// Otra cuenta no ve nada de la primera
await pb.getByRole('button', { name: 'Crear una cuenta nueva' }).tap();
await pb.fill('#auth-email', 'otra@example.com');
await pb.fill('#auth-password', 'OtraFamilia2026');
await pb.fill('#auth-repeat', 'OtraFamilia2026');
await pb.getByRole('button', { name: 'Crear cuenta' }).tap();
await waitText(pb, '#view-hoy .card', /0\s*tomas/);
step('Otra cuenta no ve los datos de la primera');

// La sesión se recuerda
await pa.reload();
await waitText(pa, '#view-hoy .card', /1\s*toma/);
step('Al volver a abrir, la sesión sigue iniciada');

assert.deepEqual(errors, [], errors.join('\n'));
step('Sin errores de JavaScript');
await browser.close();
