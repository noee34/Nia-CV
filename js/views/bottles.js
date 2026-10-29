// Pantalla BIBERONES: vista diaria navegable + resumen del día.
import { store } from '../store.js';
import { icons } from '../art.js';
import { bottleScene } from '../characters.js';
import { dayKey, fmtLongDate, relativeDayLabel, parseDayKey } from '../dates.js';
import { onDay, bottleSummary, groupByDay } from '../stats.js';
import { calendarHTML } from '../ui.js';
import { ml, bottleRow, emptyState, summaryCell } from './common.js';

export function renderBottles(state) {
  const key = state.bottlesDay;
  const today = dayKey();
  const list = onDay(store.all('bottles'), key);
  const s = bottleSummary(list);
  const isToday = key === today;

  return `
  <header class="topbar">
    <h1 class="h-section" style="font-size:2rem">Biberones</h1>
    <button class="icon-btn" data-action="bottle-calendar" aria-label="Elegir día en el calendario">${icons.calendar()}</button>
  </header>

  <div class="scene-banner small">${bottleScene()}</div>

  <nav class="daynav" aria-label="Cambiar de día">
    <button class="icon-btn" data-day-step="-1" aria-label="Día anterior">${icons.left()}</button>
    <button class="daynav-center" data-action="bottle-calendar" aria-label="Abrir calendario">
      <span class="daynav-title">${relativeDayLabel(key, today).split(',')[0]}</span>
      <span class="daynav-sub">${fmtLongDate(key, { year: parseDayKey(key).getFullYear() !== new Date().getFullYear() })}</span>
    </button>
    <button class="icon-btn" data-day-step="1" aria-label="Día siguiente" ${isToday || key > today ? 'disabled' : ''}>${icons.right()}</button>
  </nav>

  <div class="swipe-zone">
    ${list.length
      ? `<div class="card" style="padding:4px 18px"><ul class="list">${list.map(bottleRow).join('')}</ul></div>`
      : `<div class="card">${emptyState(isToday ? 'Todavía no hay biberones registrados hoy' : 'Sin biberones registrados este día', 'Pulsa “Registrar biberón” para añadir una toma.')}</div>`}

    <section class="section" aria-labelledby="sum-h">
      <div class="section-head"><h2 class="h-section" id="sum-h">Resumen del día</h2></div>
      <div class="summary">
        ${summaryCell(s.taken.toLocaleString('es-ES'), 'ml', 'Total tomado')}
        ${summaryCell(s.prepared.toLocaleString('es-ES'), 'ml', 'Total preparado')}
        ${summaryCell(s.count, '', s.count === 1 ? 'Toma' : 'Tomas')}
        ${summaryCell(s.count ? s.avg : '—', s.count ? 'ml' : '', 'Promedio por toma')}
      </div>
      ${s.prepared > s.taken ? `<p class="subtle" style="margin-top:10px">Quedaron ${ml(s.prepared - s.taken)} sin tomar entre todas las tomas.</p>` : ''}
    </section>
    <p class="subtle" style="text-align:center;margin-top:18px">Desliza a los lados para cambiar de día</p>
  </div>

  <div class="dock"><div class="dock-inner">
    <button class="btn btn-primary" data-action="add-bottle">${icons.plus({ size: 18 })} Registrar biberón</button>
  </div></div>`;
}

/** Contenido de la hoja de calendario para elegir día de biberones. */
export function bottleCalendarHTML(year, month, selected) {
  const marks = new Map();
  for (const [k, v] of groupByDay(store.all('bottles'))) marks.set(k, { bottles: v.length, poops: 0 });
  return calendarHTML({
    year, month, selected, marks, mode: 'activity', id: 'bcal',
    legend: '<div class="cal-legend"><span><i class="dot b"></i>Días con biberones</span></div>',
  });
}
