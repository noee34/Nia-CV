// Arranque, navegación por pestañas y gestión de eventos.
import { store, IDBAdapter } from './store.js';
import { SyncedAdapter } from './sync.js';
import { SupabaseRemote } from './remote-supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { showAuth } from './auth.js';
import { account, LAST_USER, sessionStorageAdapter, getRemember, familyInfo, joinFamily, getPendingInvite, setPendingInvite, localDbName } from './account.js';
import { mergeRecords } from './data-io.js';
import { icons } from './art.js';
import { applyTheme } from './theme.js';
import { openSheet, onSwipe, shiftMonth, toast, confirmDialog, $, esc } from './ui.js';
import { dayKey, addDays, weekStart, parseDayKey } from './dates.js';
import { openBottleForm, openPoopForm } from './forms.js';
import { renderToday } from './views/today.js';
import { renderBottles, bottleCalendarHTML } from './views/bottles.js';
import { renderPoops } from './views/poops.js';
import { renderDiary } from './views/diary.js';
import { openSettings, askJoin } from './views/settings.js';
import { renderProfile, openProfileForm, openAlbumMonth, setHeaderPhoto, removeHeaderPhoto } from './views/profile.js';
import { renderMedicine, openCitaForm, openSpecialistName, addToPhoneCalendar } from './views/medicine.js';
import { upcoming, dueReminders, citaTitle, reminderLabel } from './medical.js';

const TABS = {
  hoy: { label: 'Hoy', icon: icons.home, render: renderToday },
  biberones: { label: 'Biberones', icon: icons.bottle, render: renderBottles },
  cacas: { label: 'Cacas', icon: icons.diaper, render: renderPoops },
  diario: { label: 'Diario', icon: icons.calendar, render: renderDiary },
  medicina: { label: 'Medicina', icon: icons.medical, render: renderMedicine },
  nia: { label: 'Nia', icon: icons.heart, render: renderProfile },
};

const ym = (key) => { const d = parseDayKey(key); return [d.getFullYear(), d.getMonth()]; };
const today0 = dayKey();
const state = {
  tab: 'hoy',
  today: today0,
  bottlesDay: today0,
  poopsMonth: ym(today0),
  poopsSelected: today0,
  poopFilter: 'all',
  poopLimit: 40,
  diaryMode: 'week',
  diaryWeek: weekStart(today0),
  diaryMonth: ym(today0),
  diarySelected: today0,
  medSection: 'medico',
  medFilter: 'all',
  medMonth: ym(today0),
  medSelected: today0,
  medHistory: 10,
};

/* ---------- Render ---------- */

function renderTabbar() {
  $('#tabbar').innerHTML = `<div class="tabbar-inner" role="tablist">${Object.entries(TABS).map(([id, t]) =>
    `<a class="tab ${state.tab === id ? 'on' : ''}" href="#${id}" role="tab" aria-selected="${state.tab === id}" aria-current="${state.tab === id ? 'page' : 'false'}">
      <span class="tab-ico">${t.icon({ size: 22 })}</span><span>${id === 'nia' ? esc((store.settings.babyName || 'Nia').split(' ')[0]) : t.label}</span></a>`).join('')}</div>`;
}

function render() {
  for (const id of Object.keys(TABS)) {
    const el = $(`#view-${id}`);
    const active = id === state.tab;
    el.hidden = !active;
    if (active) el.innerHTML = TABS[id].render(state);
  }
  renderTabbar();
}

function go(tab) {
  if (!TABS[tab]) tab = 'hoy';
  if (state.tab === tab) return;
  state.tab = tab;
  render();
  window.scrollTo({ top: 0 });
}

/* ---------- Acciones ---------- */

function stepBottleDay(dir) {
  const next = addDays(state.bottlesDay, dir);
  if (next > dayKey()) return;
  state.bottlesDay = next;
  render();
}

function openBottleCalendar() {
  let [y, m] = ym(state.bottlesDay);
  openSheet({
    label: 'Elegir día',
    render(body, close) {
      const draw = () => {
        body.innerHTML = `<div class="sheet-head"><h2 class="h-section">Elegir día</h2>
          <button class="icon-btn" data-close aria-label="Cerrar">${icons.close()}</button></div>
          ${bottleCalendarHTML(y, m, state.bottlesDay)}
          <button class="btn btn-ghost btn-block" data-pick-today style="margin-top:14px">Volver a hoy</button>`;
      };
      draw();
      body.addEventListener('click', (e) => {
        const mb = e.target.closest('[data-month]');
        if (mb) { [y, m] = shiftMonth(y, m, Number(mb.dataset.month)); return draw(); }
        const db = e.target.closest('[data-day]');
        const key = db ? db.dataset.day : e.target.closest('[data-pick-today]') ? dayKey() : null;
        if (!key) return;
        if (key > dayKey()) return toast('Ese día todavía no ha llegado');
        state.bottlesDay = key;
        close();
        render();
      });
    },
  });
}

function editRecord(type, id) {
  const rec = store.get(type, id);
  if (!rec) return;
  (type === 'bottles' ? openBottleForm : openPoopForm)({ record: rec });
}

function selectDiaryDay(key) {
  state.diarySelected = key;
  state.diaryMonth = ym(key);
  state.diaryWeek = weekStart(key);
  render();
}

document.addEventListener('click', (e) => {
  // Las hojas inferiores gestionan sus propios clics.
  if (e.target.closest('.sheet-root, .dialog-root')) return;
  const t = e.target;
  const view = t.closest('.view');

  const action = t.closest('[data-action]')?.dataset.action;
  if (action) {
    const actions = {
      'settings': openSettings,
      'add-bottle': () => openBottleForm({ forDay: state.tab === 'biberones' ? state.bottlesDay : null }),
      'add-poop': () => openPoopForm(),
      'add-poop-day': () => openPoopForm({ forDay: state.poopsSelected }),
      'bottle-calendar': openBottleCalendar,
      'poops-more': () => { state.poopLimit += 40; render(); },
      'add-cita': () => openCitaForm({ section: state.medSection, kind: state.medSection === 'medico' && state.medFilter !== 'all' ? state.medFilter : null }),
      'add-cita-day': () => openCitaForm({ section: state.medSection, forDay: state.medSelected }),
      'rename-specialist': openSpecialistName,
      'cal-all': () => addToPhoneCalendar(upcoming(store.all('citas').filter((c) => c.section === state.medSection))),
      'med-more': () => { state.medHistory += 20; render(); },
      'edit-profile': openProfileForm,
      'remove-photo': removeHeaderPhoto,
      'go-profile': () => { location.hash = 'nia'; },
    };
    return actions[action]?.();
  }

  const cita = t.closest('[data-cita]');
  if (cita) { const rec = store.get('citas', cita.dataset.cita); if (rec) openCitaForm({ record: rec }); return; }

  // Medicina
  if (view?.id === 'view-medicina') {
    const sec = t.closest('[data-med-section]');
    if (sec) { state.medSection = sec.dataset.medSection; state.medFilter = 'all'; return render(); }
    const f = t.closest('[data-med-filter]');
    if (f) { state.medFilter = f.dataset.medFilter; return render(); }
    const mb = t.closest('[data-month]');
    if (mb) { state.medMonth = shiftMonth(...state.medMonth, Number(mb.dataset.month)); return render(); }
    const db = t.closest('[data-day]');
    if (db) { state.medSelected = db.dataset.day; state.medMonth = ym(db.dataset.day); return render(); }
  }

  const album = t.closest('[data-album]');
  if (album) return openAlbumMonth(Number(album.dataset.album));

  const edit = t.closest('[data-edit]');
  if (edit) return editRecord(edit.dataset.edit, edit.dataset.id);

  const dayStep = t.closest('[data-day-step]');
  if (dayStep) return stepBottleDay(Number(dayStep.dataset.dayStep));

  // Calendario de cacas
  if (view?.id === 'view-cacas') {
    const mb = t.closest('[data-month]');
    if (mb) { state.poopsMonth = shiftMonth(...state.poopsMonth, Number(mb.dataset.month)); return render(); }
    const db = t.closest('[data-day]');
    if (db) { state.poopsSelected = db.dataset.day; state.poopsMonth = ym(db.dataset.day); return render(); }
    const f = t.closest('[data-filter]');
    if (f) { state.poopFilter = f.dataset.filter; state.poopLimit = 40; return render(); }
  }

  // Diario
  if (view?.id === 'view-diario') {
    const mode = t.closest('[data-diary-mode]');
    if (mode) {
      state.diaryMode = mode.dataset.diaryMode;
      state.diaryMonth = ym(state.diarySelected);
      state.diaryWeek = weekStart(state.diarySelected);
      return render();
    }
    const ws = t.closest('[data-week-step]');
    if (ws) {
      const dir = Number(ws.dataset.weekStep);
      state.diaryWeek = addDays(state.diaryWeek, 7 * dir);
      const sel = addDays(state.diarySelected, 7 * dir);
      state.diarySelected = sel > dayKey() ? dayKey() : sel;
      return render();
    }
    const mb = t.closest('[data-month]');
    if (mb) { state.diaryMonth = shiftMonth(...state.diaryMonth, Number(mb.dataset.month)); return render(); }
    const sd = t.closest('[data-day], [data-select-day], tr[data-key]');
    if (sd) return selectDiaryDay(sd.dataset.day || sd.dataset.selectDay || sd.dataset.key);
  }
});

document.addEventListener('keydown', (e) => {
  const tr = e.target.closest?.('tr[data-key]');
  if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectDiaryDay(tr.dataset.key); }
});

document.addEventListener('change', (e) => {
  if (e.target.name === 'header-photo' && e.target.files?.[0]) setHeaderPhoto(e.target.files[0]);
});

window.addEventListener('hashchange', () => { if (started && TABS[location.hash.slice(1)]) go(location.hash.slice(1)); });

/* ---------- Cambio de día a medianoche y relojes relativos ---------- */

/* ---------- Recordatorios de citas dentro de la app ---------- */
const REM_KEY = 'nia-cv:avisos-hasta';
let remindersShown = new Set();
function checkReminders() {
  const now = Date.now();
  let from;
  try { from = Number(localStorage.getItem(REM_KEY)) || now - 60000; } catch { from = now - 60000; }
  from = Math.max(from, now - 3 * 86400000); // como mucho, los de los últimos 3 días
  const due = dueReminders(store.all('citas'), from, now).filter((r) => !remindersShown.has(`${r.cita.id}:${r.minutes}`));
  try { localStorage.setItem(REM_KEY, String(now)); } catch { /* nada */ }
  if (!due.length || document.querySelector('.dialog-root')) return;
  due.forEach((r) => remindersShown.add(`${r.cita.id}:${r.minutes}`));
  const lines = due.slice(0, 3).map((r) => `• ${citaTitle(r.cita)}: ${relativeDayLabelShort(r.cita.at)} a las ${fmtClock(r.cita.at)} (aviso ${reminderLabel(r.minutes).toLowerCase()})`);
  confirmDialog({
    title: due.length === 1 ? 'Recordatorio de cita' : `${due.length} recordatorios de citas`,
    message: lines.join('\n') + (due.length > 3 ? `\n… y ${due.length - 3} más` : ''),
    confirmLabel: 'Ver citas', cancelLabel: 'Entendido', danger: false,
  }).then((ok) => { if (ok) location.hash = 'medicina'; });
}
const fmtClock = (ms) => new Date(ms).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
function relativeDayLabelShort(ms) {
  const d = dayKey(ms), t = dayKey();
  if (d === t) return 'hoy';
  if (d === addDays(t, 1)) return 'mañana';
  return new Date(ms).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function tick() {
  if (started) checkReminders();
  const now = dayKey();
  if (now !== state.today) {
    const old = state.today;
    state.today = now;
    if (state.bottlesDay === old) state.bottlesDay = now;
    if (state.poopsSelected === old) { state.poopsSelected = now; state.poopsMonth = ym(now); }
    if (state.diarySelected === old) selectDiaryDay(now);
  }
  if (started && !document.querySelector('.sheet-root, .dialog-root')) render();
}
setInterval(tick, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

/* ---------- Arranque ---------- */

let started = false;

function fail(e) {
  console.error(e);
  $('#view-hoy').hidden = false;
  $('#view-hoy').innerHTML = `<div class="empty"><div class="empty-title">No se pudo abrir el diario</div><div class="empty-sub">${esc(e.message)}</div></div>`;
}

function start() {
  store.subscribe(render);
  onSwipe($('#view-biberones'), stepBottleDay);
  state.tab = TABS[location.hash.slice(1)] ? location.hash.slice(1) : 'hoy';
  started = true;
  render();
  setTimeout(checkReminders, 1500);
  document.documentElement.classList.add('ready');
}

function registerSW() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !store.cloudExpected) {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW', err));
  }
}

/* Enlace de invitación (…?codigo=ABC123): se lee una vez y se quita de la dirección. */
let inviteFromLink = '';
function readInviteLink() {
  try {
    const params = new URLSearchParams(location.search);
    const code = (params.get('codigo') || '').trim().toUpperCase();
    if (/^[A-Z0-9]{6}$/.test(code)) inviteFromLink = code;
    if (params.has('codigo')) history.replaceState(null, '', location.pathname + location.hash);
  } catch { /* nada */ }
}

/* Modo cuenta: usuario y contraseña con Supabase, datos en la nube. */

async function bootSupabase() {
  const client = globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // La sesión se guarda donde diga "Mantener la sesión iniciada" (ver account.js).
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: sessionStorageAdapter },
  });
  account.client = client;
  const authRoot = $('#auth');
  let recovering = false;
  client.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recovering = true;
      showAuth(authRoot, client, { mode: 'recovery', onSession: (s) => (started ? null : enter(s)) });
    }
  });

  let session = null;
  try { session = (await client.auth.getSession()).data.session; } catch (e) { console.warn(e); }
  if (recovering) return;
  if (session) return enter(session);

  // Sin red pero con una sesión anterior en este dispositivo: abrir los datos
  // guardados en local; se subirán en cuanto vuelva la conexión.
  const last = readLastUser();
  if (last && getRemember() && navigator.onLine === false) return enter({ user: last }, { offline: true });
  showAuth(authRoot, client, { mode: inviteFromLink ? 'signup' : 'login', invite: inviteFromLink, onSession: enter });
}

async function enter(session, { offline = false } = {}) {
  const last = readLastUser();
  const user = { id: session.user.id, email: session.user.email };
  account.user = user;

  // ¿A qué diario pertenece esta cuenta? (el suyo o el de su familia)
  let familyId = last?.id === user.id ? last.familyId : null;
  if (!offline) {
    const code = getPendingInvite();
    if (code) {
      try { await joinFamily(code); toast('Te has unido al diario de tu familia'); }
      catch (e) { toast(e.message); }
      setPendingInvite('');
    }
    try {
      account.family = await familyInfo();
      familyId = account.family?.propietario || user.id;
    } catch (e) {
      console.warn('Familia', e); // sin la función en la nube o sin red: se usa lo último conocido
    }
  }
  familyId = familyId || user.id;
  if (!account.family) account.family = { propietario: familyId, propietario_correo: familyId === user.id ? user.email : '', miembros: [] };

  try { if (getRemember()) localStorage.setItem(LAST_USER, JSON.stringify({ ...user, familyId })); } catch { /* sin almacenamiento */ }
  const adapter = new SyncedAdapter(new IDBAdapter(localDbName(user.id, familyId)), new SupabaseRemote(account.client, familyId));
  try {
    await store.init({ adapter, backend: 'supabase', account: user.email });
  } catch (e) { return fail(e); }
  start();
  registerSW();
  if (offline) toast('Sin conexión: lo que registres se subirá a la nube al volver la red.');
  try { const kept = sessionStorage.getItem('nia-cv:invite-after-login'); if (kept) { inviteFromLink = kept; sessionStorage.removeItem('nia-cv:invite-after-login'); } } catch { /* nada */ }
  if (inviteFromLink && !offline) {
    // Ya tenía sesión y ha abierto un enlace de invitación: que confirme el código.
    if (familyId === user.id && account.family?.propietario === user.id) askJoin(inviteFromLink);
    else toast('Ya compartes este diario');
    inviteFromLink = '';
  } else if (familyId === user.id) offerLocalImport();
}

function readLastUser() {
  try { return JSON.parse(localStorage.getItem(LAST_USER) || 'null'); } catch { return null; }
}

/** Si este dispositivo tenía registros del modo local, ofrece subirlos a la cuenta. */
async function offerLocalImport() {
  try {
    if (localStorage.getItem('nia-cv:imported')) return;
    const legacy = new IDBAdapter();
    await legacy.open();
    const bottles = await legacy.getAll('bottles');
    const poops = await legacy.getAll('poops');
    legacy.db.close();
    if (!bottles.length && !poops.length) return;
    const ok = await confirmDialog({
      title: 'Registros en este dispositivo',
      message: `Hay ${bottles.length} biberones y ${poops.length} deposiciones guardados aquí sin cuenta. ¿Quieres subirlos a tu cuenta? No se duplican.`,
      confirmLabel: 'Subir a mi cuenta', cancelLabel: 'Ahora no', danger: false,
    });
    localStorage.setItem('nia-cv:imported', ok ? 'yes' : 'no');
    if (!ok) return;
    for (const [t, recs] of [['bottles', bottles], ['poops', poops]]) {
      const { merged } = mergeRecords(store.all(t), recs);
      const fresh = merged.filter((r) => !store.get(t, r.id) || store.get(t, r.id) !== r);
      if (fresh.length) { await store.adapter.putMany(t, fresh); store.data[t] = merged; }
    }
    store.emit();
    toast('Registros subidos a tu cuenta');
  } catch (e) { console.warn('Importación local', e); }
}

async function boot() {
  applyTheme();
  readInviteLink();
  const inClaude = typeof globalThis.claude?.use === 'function';
  if (!inClaude && SUPABASE_URL && SUPABASE_ANON_KEY && globalThis.supabase?.createClient) return bootSupabase();
  try { await store.init(); } catch (e) { return fail(e); }
  start();
  if (store.cloudExpected && store.backend !== 'cloud') toast('Sin conexión con la nube: los cambios se guardan solo en este dispositivo.');
  else if (store.backend === 'memory') toast('Este navegador no permite guardar datos. Usa Safari normal, no privado.');
  registerSW();
}

boot();
