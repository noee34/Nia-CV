// Pantalla DIARIO: evolución semanal, calendario de actividad y detalle del día.
// Sólo muestra datos registrados; no interpreta ni diagnostica.
import { store } from '../store.js';
import { icons } from '../art.js';
import { calendarHTML } from '../ui.js';
import { dayKey, addDays, fmtShortDate, weekdayShort, fmtLongDate, cap, parseDayKey } from '../dates.js';
import { weekRows, groupByDay, onDay, bottleSummary } from '../stats.js';
import { bottleRow, poopRow, summaryCell, plural } from './common.js';

export function renderDiary(state) {
  const mode = state.diaryMode;
  return `
  <header class="topbar"><h1 class="h-section" style="font-size:2rem">Diario</h1></header>
  <p class="subtle" style="margin:-4px 0 16px">La evolución de los pequeños días.</p>
  <div class="segmented" role="tablist" aria-label="Vista">
    <button role="tab" aria-selected="${mode === 'week'}" class="${mode === 'week' ? 'on' : ''}" data-diary-mode="week">Semana</button>
    <button role="tab" aria-selected="${mode === 'month'}" class="${mode === 'month' ? 'on' : ''}" data-diary-mode="month">Mes</button>
  </div>
  <div style="margin-top:16px">${mode === 'week' ? weekHTML(state) : monthHTML(state)}</div>
  ${dayDetailHTML(state.diarySelected)}
  <div class="note-box">${icons.heart({ size: 18 })}<span>Un registro personal para recordar el día a día. No sustituye la valoración de un profesional sanitario.</span></div>`;
}

function weekHTML(state) {
  const start = state.diaryWeek;
  const end = addDays(start, 6);
  const today = dayKey();
  const rows = weekRows(store.all('bottles'), store.all('poops'), start);
  const max = Math.max(1, ...rows.map((r) => r.taken));
  const totTaken = rows.reduce((s, r) => s + r.taken, 0);
  const totCount = rows.reduce((s, r) => s + r.count, 0);
  const totPoops = rows.reduce((s, r) => s + r.poops, 0);
  const daysWithBottles = rows.filter((r) => r.count).length;
  const daysWithPoops = rows.filter((r) => r.poops).length;

  return `
  <nav class="daynav" aria-label="Cambiar de semana" style="margin-top:0">
    <button class="icon-btn" data-week-step="-1" aria-label="Semana anterior">${icons.left()}</button>
    <div class="daynav-center"><span class="daynav-title" style="font-size:1.25rem">${fmtShortDate(start)} – ${fmtShortDate(end)}</span>
      <span class="daynav-sub">${start <= today && today <= end ? 'Esta semana' : parseDayKey(start).getFullYear()}</span></div>
    <button class="icon-btn" data-week-step="1" aria-label="Semana siguiente" ${end >= today ? 'disabled' : ''}>${icons.right()}</button>
  </nav>

  <section class="card" aria-label="Leche tomada por día">
    <div class="card-head"><span class="eyebrow">Leche tomada por día</span><span class="card-badge">${icons.chart({ size: 20 })}</span></div>
    <div class="chart" role="img" aria-label="${rows.map((r) => `${weekdayShort(r.key)} ${r.taken} mililitros`).join(', ')}">
      ${rows.map((r) => `<button class="bar-col ${r.key === state.diarySelected ? 'sel' : ''}" data-select-day="${r.key}" aria-label="${weekdayShort(r.key)}">
        <span class="bar-val">${r.taken ? r.taken : ''}</span>
        <span class="bar ${r.taken ? '' : 'zero'}" style="height:${r.taken ? Math.max(6, (r.taken / max) * 110) : 3}px"></span></button>`).join('')}
    </div>
    <div class="chart-x">${rows.map((r) => `<div class="${r.key === today ? 'today' : ''}">${weekdayShort(r.key).slice(0, 2)}</div>`).join('')}</div>
    <div class="poop-row" aria-label="Deposiciones por día">${rows.map((r) => `<span>${'<i class="dot p"></i>'.repeat(Math.min(r.poops, 6))}</span>`).join('')}</div>
    <div class="cal-legend"><span><i class="dot b" style="background:var(--blue)"></i>ml tomados</span><span><i class="dot p"></i>Deposiciones</span></div>
  </section>

  <div class="summary" style="margin-top:14px">
    ${summaryCell(totTaken.toLocaleString('es-ES'), 'ml', 'Tomado en la semana')}
    ${summaryCell(daysWithBottles ? Math.round(totTaken / daysWithBottles).toLocaleString('es-ES') : '—', daysWithBottles ? 'ml' : '', 'Media por día registrado')}
    ${summaryCell(totCount, '', 'Tomas registradas')}
    ${summaryCell(totPoops, '', `Deposiciones · ${daysWithPoops}/7 días`)}
  </div>

  <section class="section" aria-labelledby="cmp-h">
    <div class="section-head"><h2 class="h-section" id="cmp-h">Comparar días</h2></div>
    <div class="card" style="padding:16px 18px 6px">
      <table class="cmp">
        <thead><tr><th scope="col">Día</th><th scope="col">Tomas</th><th scope="col">Tomado</th><th scope="col">Media</th><th scope="col">Cacas</th></tr></thead>
        <tbody>${rows.map((r) => `<tr data-key="${r.key}" class="${r.key === today ? 'is-today' : ''}" tabindex="0" aria-selected="${r.key === state.diarySelected}">
          <td>${weekdayShort(r.key)} ${parseDayKey(r.key).getDate()}</td>
          <td class="${r.count ? '' : 'muted'}">${r.count || '—'}</td>
          <td class="${r.taken ? '' : 'muted'}">${r.taken ? `${r.taken} ml` : '—'}</td>
          <td class="${r.count ? '' : 'muted'}">${r.count ? `${r.avg} ml` : '—'}</td>
          <td class="${r.poops ? '' : 'muted'}">${r.poops || '—'}</td></tr>`).join('')}</tbody>
      </table>
    </div>
  </section>`;
}

function monthHTML(state) {
  const [y, m] = state.diaryMonth;
  const marks = new Map();
  for (const [k, v] of groupByDay(store.all('bottles'))) marks.set(k, { bottles: v.length, poops: 0 });
  for (const [k, v] of groupByDay(store.all('poops'))) marks.set(k, { ...(marks.get(k) || { bottles: 0 }), poops: v.length });
  return calendarHTML({ year: y, month: m, selected: state.diarySelected, marks, mode: 'activity', id: 'dcal' });
}

function dayDetailHTML(key) {
  const bottles = onDay(store.all('bottles'), key);
  const poops = onDay(store.all('poops'), key);
  const s = bottleSummary(bottles);
  const empty = !bottles.length && !poops.length;
  return `<section class="section" aria-labelledby="dd-h" aria-live="polite">
    <div class="section-head"><h2 class="h-section" id="dd-h">${cap(fmtLongDate(key))}</h2></div>
    ${empty ? `<div class="card"><p style="margin:0;font-family:var(--serif);font-size:1.25rem;font-style:italic">Sin registros</p>
      <p class="subtle" style="margin:4px 0 0">No hay biberones ni deposiciones anotados este día.</p></div>`
    : `<div class="summary">
        ${summaryCell(s.count, '', s.count === 1 ? 'Toma' : 'Tomas')}
        ${summaryCell(s.taken.toLocaleString('es-ES'), 'ml', 'Tomado')}
        ${summaryCell(s.prepared.toLocaleString('es-ES'), 'ml', 'Preparado')}
        ${summaryCell(poops.length, '', poops.length === 1 ? 'Deposición' : 'Deposiciones')}
      </div>
      ${bottles.length ? `<div class="eyebrow group-label" style="margin-top:20px">Biberones · ${plural(bottles.length, 'toma', 'tomas')}</div>
        <div class="card" style="padding:4px 18px"><ul class="list">${bottles.map(bottleRow).join('')}</ul></div>` : ''}
      ${poops.length ? `<div class="eyebrow group-label" style="margin-top:20px">Deposiciones</div>
        <div class="card" style="padding:4px 18px"><ul class="list">${poops.map(poopRow).join('')}</ul></div>` : ''}`}
  </section>`;
}
