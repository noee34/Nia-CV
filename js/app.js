// Arranque, navegación por pestañas y gestión de eventos.
import { store } from './store.js';
import { icons } from './art.js';
import { openSheet, onSwipe, shiftMonth, toast, $, esc } from './ui.js';
import { dayKey, addDays, weekStart, parseDayKey } from './dates.js';
import { openBottleForm, openPoopForm } from './forms.js';
import { renderToday } from './views/today.js';
import { renderBottles, bottleCalendarHTML } from './views/bottles.js';
import { renderPoops } from './views/poops.js';
import { renderDiary } from './views/diary.js';
import { openSettings } from './views/settings.js';

const TABS = {
  hoy: { label: 'Hoy', icon: icons.home, render: renderToday },
  biberones: { label: 'Biberones', icon: icons.bottle, render: renderBottles },
  cacas: { label: 'Cacas', icon: icons.diaper, render: renderPoops },
  diario: { label: 'Diario', icon: icons.calendar, render: renderDiary },
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
};

/* ---------- Render ---------- */

function renderTabbar() {
  $('#tabbar').innerHTML = `<div class="tabbar-inner" role="tablist">${Object.entries(TABS).map(([id, t]) =>
    `<a class="tab ${state.tab === id ? 'on' : ''}" href="#${id}" role="tab" aria-selected="${state.tab === id}" aria-current="${state.tab === id ? 'page' : 'false'}">
      <span class="tab-ico">${t.icon({ size: 22 })}</span><span>${t.label}</span></a>`).join('')}</div>`;
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
    };
    return actions[action]?.();
  }

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

window.addEventListener('hashchange', () => go(location.hash.slice(1)));

/* ---------- Cambio de día a medianoche y relojes relativos ---------- */

function tick() {
  const now = dayKey();
  if (now !== state.today) {
    const old = state.today;
    state.today = now;
    if (state.bottlesDay === old) state.bottlesDay = now;
    if (state.poopsSelected === old) { state.poopsSelected = now; state.poopsMonth = ym(now); }
    if (state.diarySelected === old) selectDiaryDay(now);
  }
  if (!document.querySelector('.sheet-root, .dialog-root')) render();
}
setInterval(tick, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

/* ---------- Arranque ---------- */

async function boot() {
  try {
    await store.init();
  } catch (e) {
    console.error(e);
    $('#view-hoy').hidden = false;
    $('#view-hoy').innerHTML = `<div class="empty"><div class="empty-title">No se pudo abrir el diario</div><div class="empty-sub">${esc(e.message)}</div></div>`;
    return;
  }
  store.subscribe(render);
  onSwipe($('#view-biberones'), stepBottleDay);
  state.tab = TABS[location.hash.slice(1)] ? location.hash.slice(1) : 'hoy';
  render();
  document.documentElement.classList.add('ready');
  if (store.cloudExpected && store.backend !== 'cloud') toast('Sin conexión con la nube: los cambios se guardan solo en este dispositivo.');
  else if (store.backend === 'memory') toast('Este navegador no permite guardar datos. Usa Safari normal, no privado.');

  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !store.cloudExpected) {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW', err));
  }
}

boot();
