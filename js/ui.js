// Componentes reutilizables: hoja inferior, confirmación, aviso y calendario.
import { icons } from './art.js';
import { monthGrid, fmtMonth, WEEKDAY_INITIALS, dayKey } from './dates.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let openSheets = 0;

/**
 * Abre una hoja inferior. `render(el, close)` monta el contenido.
 * Devuelve una función para cerrarla.
 */
export function openSheet({ label, render, onClose }) {
  const root = document.createElement('div');
  root.className = 'sheet-root';
  root.innerHTML = `<div class="sheet-backdrop" data-close></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}"><div class="grabber" aria-hidden="true"></div><div class="sheet-body"></div></section>`;
  document.body.appendChild(root);
  openSheets++;
  document.body.style.overflow = 'hidden';
  const sheet = $('.sheet', root);
  const prevFocus = document.activeElement;
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    root.classList.add('closing');
    sheet.classList.add('closing');
    setTimeout(() => {
      root.remove();
      if (--openSheets === 0) document.body.style.overflow = '';
      prevFocus?.focus?.({ preventScroll: true });
      onClose?.();
    }, 230);
  };

  root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // Deslizar hacia abajo desde la parte superior para cerrar.
  let startY = null;
  sheet.addEventListener('touchstart', (e) => { startY = sheet.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (startY == null) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0 && !e.target.closest('input, textarea')) sheet.style.transform = `translateY(${dy * 0.6}px)`;
  }, { passive: true });
  sheet.addEventListener('touchend', (e) => {
    if (startY == null) return;
    const dy = e.changedTouches[0].clientY - startY;
    sheet.style.transform = '';
    startY = null;
    if (dy > 120) close();
  });

  render($('.sheet-body', root), close);
  requestAnimationFrame(() => sheet.focus?.({ preventScroll: true }));
  sheet.tabIndex = -1;
  return close;
}

export function confirmDialog({ title, message, confirmLabel = 'Eliminar', cancelLabel = 'Cancelar', danger = true }) {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'dialog-root';
    root.innerHTML = `<div class="sheet-backdrop" data-no></div>
      <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-m">
        <h3 id="dlg-t">${esc(title)}</h3>
        <p id="dlg-m">${esc(message)}</p>
        <button class="btn ${danger ? 'btn-danger-fill' : 'btn-primary'}" data-yes>${esc(confirmLabel)}</button>
        <button class="btn btn-ghost" data-no>${esc(cancelLabel)}</button>
      </div>`;
    document.body.appendChild(root);
    const done = (v) => { root.remove(); resolve(v); };
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-yes]')) done(true);
      else if (e.target.closest('[data-no]')) done(false);
    });
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(false); });
    $('[data-no].btn', root).focus();
  });
}

let toastTimer;
export function toast(message) {
  document.querySelector('.toast')?.remove();
  clearTimeout(toastTimer);
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<span class="ok">${icons.check({ size: 15 })}</span><span>${esc(message)}</span>`;
  document.body.appendChild(el);
  toastTimer = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2200);
}

/**
 * Calendario mensual.
 * marks: Map(dayKey -> { bottles, poops })
 * mode: 'poops' (punto + contador) | 'activity' (punto azul + punto terracota)
 */
export function calendarHTML({ year, month, selected, marks, mode = 'activity', id = 'cal', legend }) {
  const today = dayKey();
  const weeks = monthGrid(year, month);
  const cells = weeks.flat().map((c) => {
    const m = marks.get(c.key) || { bottles: 0, poops: 0 };
    let ind = '';
    if (mode === 'poops') {
      if (m.poops === 1) ind = '<i class="dot p"></i>';
      else if (m.poops > 1) ind = `<span class="cnt">${m.poops}</span>`;
    } else {
      if (m.bottles) ind += '<i class="dot b"></i>';
      if (m.poops) ind += '<i class="dot p"></i>';
    }
    const cls = ['cal-day', !c.inMonth && 'out', c.key === today && 'today', c.key === selected && 'sel', c.key > today && 'future'].filter(Boolean).join(' ');
    const desc = mode === 'poops'
      ? (m.poops ? `, ${m.poops} ${m.poops === 1 ? 'deposición' : 'deposiciones'}` : '')
      : `${m.bottles ? `, ${m.bottles} biberones` : ''}${m.poops ? `, ${m.poops} deposiciones` : ''}`;
    return `<button class="${cls}" data-day="${c.key}" aria-pressed="${c.key === selected}" aria-label="${c.day}${desc}"><span class="cal-num">${c.day}</span><span class="cal-marks">${ind}</span></button>`;
  }).join('');
  return `<div class="cal" id="${id}">
    <div class="cal-head">
      <button class="icon-btn" data-month="-1" aria-label="Mes anterior">${icons.left()}</button>
      <div class="cal-title" aria-live="polite">${fmtMonth(year, month)}</div>
      <button class="icon-btn" data-month="1" aria-label="Mes siguiente">${icons.right()}</button>
    </div>
    <div class="cal-grid" role="grid">
      ${WEEKDAY_INITIALS.map((d) => `<div class="cal-wd" aria-hidden="true">${d}</div>`).join('')}
      ${cells}
    </div>
    ${legend ?? (mode === 'activity'
      ? '<div class="cal-legend"><span><i class="dot b"></i>Biberones</span><span><i class="dot p"></i>Deposiciones</span></div>'
      : '<div class="cal-legend"><span><i class="dot p"></i>Con registro</span><span><span class="cnt">2</span>Varias</span></div>')}
  </div>`;
}

/** Cambia de mes conservando año correcto (dic → ene). */
export function shiftMonth(year, month, delta) {
  const d = new Date(year, month + delta, 1);
  return [d.getFullYear(), d.getMonth()];
}

/** Gestos horizontales (anterior / siguiente). */
export function onSwipe(el, cb) {
  let x0 = null, y0 = null;
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) cb(dx < 0 ? 1 : -1);
  }, { passive: true });
}
