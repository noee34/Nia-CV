// Piezas compartidas por varias pantallas.
import { icons, consistencyIcon } from '../art.js';
import { sleepingScene } from '../characters.js';
import { esc } from '../ui.js';
import { fmtTime } from '../dates.js';
import { CONSISTENCIES } from '../stats.js';

export const ml = (n) => `${Number(n).toLocaleString('es-ES')} ml`;
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** 'hace 2 h 10 min' */
export function fmtAgo(ms, now = Date.now()) {
  const min = Math.max(0, Math.round((now - ms) / 60000));
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return `hace ${h} h${m ? ` ${m} min` : ''}`;
  const d = Math.floor(h / 24);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

export const consPill = (key) =>
  `<span class="pill">${consistencyIcon[key](22)}${CONSISTENCIES[key]?.label ?? key}</span>`;

export function bottleRow(b) {
  return `<li><button class="row" data-edit="bottles" data-id="${b.id}" aria-label="Biberón de las ${fmtTime(b.at)}, ${b.taken} mililitros tomados de ${b.prepared}. Editar">
    <span class="row-time">${fmtTime(b.at)}</span>
    <span><span class="row-title tnum">${ml(b.taken)} tomados</span>
      <span class="row-sub tnum" style="display:block">de ${ml(b.prepared)} preparados</span>
      ${b.notes ? `<span class="row-note" style="display:block">“${esc(b.notes)}”</span>` : ''}</span>
    <span class="row-chev">${icons.right({ size: 18 })}</span>
  </button></li>`;
}

export function poopRow(p) {
  return `<li><button class="row" data-edit="poops" data-id="${p.id}" aria-label="Deposición de las ${fmtTime(p.at)}, ${CONSISTENCIES[p.consistency]?.label}. Editar">
    <span class="row-time">${fmtTime(p.at)}</span>
    <span>${consPill(p.consistency)}
      ${p.notes ? `<span class="row-note" style="display:block">“${esc(p.notes)}”</span>` : ''}</span>
    <span class="row-chev">${icons.right({ size: 18 })}</span>
  </button></li>`;
}

export function emptyState(title, sub = '', size = 120) {
  return `<div class="empty">${sleepingScene(size + 20)}<div class="empty-title">${esc(title)}</div>${sub ? `<div class="empty-sub">${esc(sub)}</div>` : ''}</div>`;
}

export const summaryCell = (num, unit, label) =>
  `<div><div class="num">${num}${unit ? `<small>${unit}</small>` : ''}</div><div class="lbl">${label}</div></div>`;

/** Texto del estado de sincronización (null = sin nube). */
export function syncLabel(sync) {
  if (!sync) return { short: '', long: '', tone: '' };
  if (sync.pending && (sync.error || sync.online === false)) {
    const n = `${sync.pending} ${sync.pending === 1 ? 'cambio' : 'cambios'}`;
    return { short: `Sin conexión · ${sync.pending} por subir`, long: `Sin conexión. ${n} guardado${sync.pending === 1 ? '' : 's'} en este dispositivo; se subirá${sync.pending === 1 ? '' : 'n'} solo${sync.pending === 1 ? '' : 's'}.`, tone: 'warn' };
  }
  if (sync.pending || sync.syncing) return { short: 'Guardando…', long: 'Subiendo cambios a la nube…', tone: 'busy' };
  if (sync.error) return { short: 'Sin conexión', long: 'Sin conexión con la nube. Lo que registres se guardará aquí y se subirá después.', tone: 'warn' };
  return { short: 'En la nube', long: sync.lastSync ? `Todo guardado en la nube · ${new Date(sync.lastSync).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'Conectando con la nube…', tone: 'ok' };
}
