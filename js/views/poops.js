// Pantalla CACAS: calendario mensual, detalle del día e historial filtrable.
import { store } from '../store.js';
import { icons } from '../art.js';
import { calendarHTML } from '../ui.js';
import { dayKey, fmtLongDate, relativeDayLabel, cap } from '../dates.js';
import { groupByDay, CONSISTENCIES, byTimeDesc } from '../stats.js';
import { poopRow, plural, emptyState } from './common.js';

const FILTERS = [['all', 'Todas'], ['blanda', 'Blanda'], ['normal', 'Normal'], ['dura', 'Dura'], ['liquida', 'Muy líquida']];

export function renderPoops(state) {
  const all = store.all('poops');
  const byDay = groupByDay(all);
  const marks = new Map([...byDay].map(([k, v]) => [k, { bottles: 0, poops: v.length }]));
  const [y, m] = state.poopsMonth;
  const sel = state.poopsSelected;
  const dayList = byDay.get(sel) || [];

  const filtered = all.filter((p) => state.poopFilter === 'all' || p.consistency === state.poopFilter).sort(byTimeDesc);
  const shown = filtered.slice(0, state.poopLimit);
  const groups = groupByDay(shown);
  const today = dayKey();
  const historyHTML = [...groups.keys()].sort().reverse().map((k) => `
      <div class="eyebrow group-label">${relativeDayLabel(k, today)}</div>
      <ul class="list">${groups.get(k).slice().sort(byTimeDesc).map(poopRow).join('')}</ul>`).join('');

  return `
  <header class="topbar">
    <h1 class="h-section" style="font-size:2rem">Cacas</h1>
  </header>
  <p class="subtle" style="margin:-4px 0 16px">Toca un día para ver sus registros.</p>

  ${calendarHTML({ year: y, month: m, selected: sel, marks, mode: 'poops', id: 'pcal' })}

  <section class="card day-detail" aria-live="polite" aria-labelledby="pday-h">
    <div class="day-detail-head">
      <h2 class="h-section" id="pday-h" style="font-size:1.3rem">${cap(fmtLongDate(sel))}</h2>
      <span class="subtle">${dayList.length ? plural(dayList.length, 'deposición', 'deposiciones') : ''}</span>
    </div>
    ${dayList.length
      ? `<ul class="list">${dayList.map(poopRow).join('')}</ul>`
      : `<p style="margin:6px 0 2px;font-family:var(--serif);font-size:1.25rem;font-style:italic">Sin registros</p>
         <p class="subtle" style="margin:0 0 6px">No hay ninguna deposición anotada este día.</p>`}
    ${sel <= today ? `<button class="link-btn" data-action="add-poop-day">${icons.plus({ size: 16 })} Registrar en este día</button>` : ''}
  </section>

  <section class="section" aria-labelledby="hist-h">
    <div class="section-head"><h2 class="h-section" id="hist-h">Historial</h2><span class="subtle">${plural(filtered.length, 'registro', 'registros')}</span></div>
    <div class="chips scroll" role="group" aria-label="Filtrar por consistencia">
      ${FILTERS.map(([k, l]) => `<button class="chip ${state.poopFilter === k ? 'on' : ''}" data-filter="${k}" aria-pressed="${state.poopFilter === k}">${l}</button>`).join('')}
    </div>
    <div style="margin-top:6px">
      ${shown.length ? historyHTML
        : emptyState(all.length ? `Sin registros ${CONSISTENCIES[state.poopFilter] ? `“${CONSISTENCIES[state.poopFilter].label.toLowerCase()}”` : ''}` : 'Cuando registres una deposición, aparecerá aquí', '', 100)}
    </div>
    ${filtered.length > shown.length ? '<button class="btn btn-ghost btn-block" data-action="poops-more" style="margin-top:12px">Ver más</button>' : ''}
  </section>

  <div class="dock"><div class="dock-inner">
    <button class="btn btn-primary" data-action="add-poop">${icons.plus({ size: 18 })} Registrar caca</button>
  </div></div>`;
}
