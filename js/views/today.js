// Pantalla HOY: resumen del día y actividad reciente.
import { store } from '../store.js';
import { icons, logo, heroIllustration, paw, consistencyIcon, smallStar } from '../art.js';
import { esc } from '../ui.js';
import { dayKey, fmtLongDate, fmtTime } from '../dates.js';
import { onDay, bottleSummary, poopSummary, nextReference, CONSISTENCIES, byTimeAsc } from '../stats.js';
import { ml, fmtAgo, plural, emptyState } from './common.js';

export function renderToday() {
  const key = dayKey();
  const name = store.settings.babyName || 'Nia';
  const bottles = onDay(store.all('bottles'), key);
  const poops = onDay(store.all('poops'), key);
  const bs = bottleSummary(bottles);
  const ps = poopSummary(poops);

  // La referencia usa el último biberón registrado (aunque sea de ayer).
  const lastEver = bottleSummary(store.all('bottles')).last;
  const next = nextReference(lastEver?.at, store.settings.nextIntervalMin);

  const events = [
    ...bottles.map((b) => ({ ...b, kind: 'bottles' })),
    ...poops.map((p) => ({ ...p, kind: 'poops' })),
  ].sort(byTimeAsc);

  return `
  <header class="topbar">
    ${logo()}
    <button class="icon-btn" data-action="settings" aria-label="Ajustes">${icons.gear()}</button>
  </header>

  <section class="hero">
    <div>
      <h1 class="h-display">${esc(name)}, <em>hoy</em></h1>
      <div class="date-line">${fmtLongDate(key)}</div>
      <div class="tagline">Tu pequeño diario de cuidados</div>
    </div>
    ${heroIllustration()}
  </section>

  <article class="card" aria-labelledby="card-b">
    <div class="card-head">
      <span class="eyebrow" id="card-b">Biberones de hoy</span>
      <span class="card-badge">${icons.bottle()}</span>
    </div>
    <div class="metric"><span class="metric-num tnum">${bs.count}</span><span class="metric-unit">${bs.count === 1 ? 'toma' : 'tomas'}</span></div>
    <div class="metric-sub">${bs.count
      ? `<strong class="tnum">${ml(bs.taken)}</strong> registrados`
      : 'Todavía no hay biberones registrados hoy'}</div>
    <div class="facts">
      <div class="fact"><span class="fact-label">Último biberón</span>
        ${bs.last ? `<span class="fact-value tnum">${fmtTime(bs.last.at)}</span><span class="fact-hint">${fmtAgo(bs.last.at)}</span>`
        : lastEver ? `<span class="fact-value tnum">${fmtTime(lastEver.at)}</span><span class="fact-hint">${fmtAgo(lastEver.at)}</span>`
        : '<span class="fact-value soft">—</span>'}</div>
      <div class="fact"><span class="fact-label">Próximo</span>
        ${next ? `<span class="fact-value tnum">${fmtTime(next)}</span><span class="fact-hint">Referencia orientativa</span>`
        : `<button class="link-btn" data-action="settings" style="min-height:28px">Opcional · Activar</button>`}</div>
    </div>
    <button class="btn btn-blue btn-block" data-action="add-bottle">${icons.plus({ size: 18 })} Añadir biberón</button>
  </article>

  <article class="card" aria-labelledby="card-p">
    <div class="card-head">
      <span class="eyebrow" id="card-p">Pañales y cacas</span>
      <span class="card-badge terra">${icons.diaper()}</span>
    </div>
    <div class="metric"><span class="metric-num tnum">${ps.count}</span><span class="metric-unit">${ps.count === 1 ? 'deposición hoy' : 'deposiciones hoy'}</span></div>
    <div class="metric-sub">${ps.count ? 'Registradas en el diario' : 'Cuando registres una deposición, aparecerá aquí'}</div>
    <div class="facts">
      <div class="fact"><span class="fact-label">Último registro</span>
        ${ps.last ? `<span class="fact-value tnum">${fmtTime(ps.last.at)}</span><span class="fact-hint">${fmtAgo(ps.last.at)}</span>` : '<span class="fact-value soft">—</span>'}</div>
      <div class="fact"><span class="fact-label">Consistencia</span>
        ${ps.last ? `<span class="fact-value" style="display:flex;align-items:center;gap:4px">${consistencyIcon[ps.last.consistency](22)}${CONSISTENCIES[ps.last.consistency].label}</span>` : '<span class="fact-value soft">—</span>'}</div>
    </div>
    <button class="btn btn-terra btn-block" data-action="add-poop">${icons.plus({ size: 18 })} Registrar caca</button>
  </article>

  <section class="section" aria-labelledby="recent-h">
    <div class="section-head">
      <h2 class="h-section" id="recent-h">Actividad reciente</h2>
      <span class="subtle">${events.length ? plural(events.length, 'registro', 'registros') : ''}</span>
    </div>
    ${events.length ? `<ol class="timeline">${events.map(timelineItem).join('')}</ol>
      <p class="subtle" style="text-align:center;margin-top:8px">Toca un registro para editarlo o eliminarlo</p>`
      : emptyState(`Un día más guardando pequeños recuerdos de ${name}`, 'Los biberones y pañales de hoy aparecerán aquí, ordenados por hora.')}
  </section>

  <div class="deco-row" aria-hidden="true">${paw(12)}${smallStar(8)}${paw(12)}</div>`;
}

function timelineItem(e) {
  const isB = e.kind === 'bottles';
  const title = isB ? `Biberón · <span class="tnum">${ml(e.taken)}</span>` : `Caca · ${CONSISTENCIES[e.consistency].label}`;
  const meta = isB ? `de ${ml(e.prepared)} preparados${e.notes ? ` · ${esc(e.notes)}` : ''}` : esc(e.notes || '');
  return `<li class="tl-item"><button class="tl-btn" data-edit="${e.kind}" data-id="${e.id}" aria-label="${fmtTime(e.at)}, ${isB ? `biberón de ${e.taken} mililitros` : `caca ${CONSISTENCIES[e.consistency].label}`}. Editar">
    <span class="tl-dot ${isB ? '' : 'poop'}">${isB ? icons.bottle({ size: 20 }) : consistencyIcon[e.consistency](26)}</span>
    <span class="tl-main"><span class="tl-title" style="display:block">${title}</span>${meta ? `<span class="tl-meta" style="display:block">${meta}</span>` : ''}</span>
    <span class="tl-time">${fmtTime(e.at)}</span>
  </button></li>`;
}
