// SÓLIDOS (pestaña Comidas → Sólidos): qué comió, cuánto, si le gustó y cómo le
// sentó; alimentos probados; tarjeta en Hoy.
import { store } from '../store.js';
import { icons } from '../art.js';
import { pupIcon } from '../characters.js';
import { openSheet, confirmDialog, toast, esc, $, $$ } from '../ui.js';
import { dayKey, combineLocal, toDateInput, toTimeInput, fmtTime, fmtShortDate } from '../dates.js';
import { onDay } from '../stats.js';
import {
  TEXTURES, AMOUNTS, LIKES, TOLERANCE, SYMPTOMS, validateSolid, isNewFood, foodsSummary, daySummary, foodKey,
} from '../solids.js';
import { emptyState } from './common.js';

const FUTURE_SLACK_MS = 5 * 60000;

/** Medidor de cuánto comió (5 puntitos). */
const amountDots = (amount) => `<span class="amount-dots" aria-hidden="true">${[1, 2, 3, 4].map((i) => `<i class="${AMOUNTS[amount]?.level >= i ? 'on' : ''}"></i>`).join('')}</span>`;
const tolPill = (t) => `<span class="pill tol-pill ${t}">${t === 'bien' ? icons.check({ size: 13 }) : icons.bell({ size: 13 })} ${TOLERANCE[t]?.short || ''}</span>`;

export function solidRow(r) {
  const extra = [r.texture ? TEXTURES[r.texture] : '', r.liked ? LIKES[r.liked] : ''].filter(Boolean).join(' · ');
  return `<li><button class="row solid-row" data-solid="${r.id}" aria-label="${esc(r.food)} a las ${fmtTime(r.at)}, comió ${AMOUNTS[r.amount]?.label}, ${TOLERANCE[r.tolerance]?.label}. Editar">
    <span class="row-time">${fmtTime(r.at)}</span>
    <span class="solid-main">
      <span class="row-title">${esc(r.food)} ${r.firstTime ? '<span class="pill new-pill">Primera vez</span>' : ''}</span>
      <span class="solid-tags">${amountDots(r.amount)}<span class="subtle">Comió: ${AMOUNTS[r.amount]?.label}</span> ${tolPill(r.tolerance)}</span>
      ${extra ? `<span class="row-sub" style="display:block">${esc(extra)}</span>` : ''}
      ${r.symptoms?.length ? `<span class="row-note" style="display:block">${esc(r.symptoms.join(', '))}</span>` : ''}
      ${r.notes ? `<span class="row-note" style="display:block">“${esc(r.notes)}”</span>` : ''}
    </span>
    <span class="row-chev">${icons.right({ size: 18 })}</span>
  </button></li>`;
}

/** Apartado Sólidos (usa el mismo día que el apartado Biberones). */
export function renderSolidsSection(state) {
  const key = state.bottlesDay;
  const today = dayKey();
  const all = store.all('solids');
  const list = onDay(all, key);
  const sum = daySummary(list);
  const foods = foodsSummary(all);
  const shownFoods = state.foodsFilter === 'mal' ? foods.filter((f) => f.worst !== 'bien') : foods;

  return `
  <div class="swipe-zone">
    ${list.length
      ? `<div class="card" style="padding:4px 18px"><ul class="list">${list.map(solidRow).join('')}</ul></div>
         <p class="subtle" style="margin:10px 4px 0">${sum.count} ${sum.count === 1 ? 'comida' : 'comidas'}${sum.newFoods ? ` · ${sum.newFoods} ${sum.newFoods === 1 ? 'alimento nuevo' : 'alimentos nuevos'}` : ''} · ${TOLERANCE[sum.worst].label.toLowerCase()}</p>`
      : `<div class="card">${emptyState(key === today ? 'Todavía no hay comidas sólidas hoy' : 'Sin comidas sólidas este día', all.length ? 'Pulsa “Registrar comida” para apuntar lo que ha comido.' : 'Cuando empiece con los sólidos, apunta aquí cada comida: qué comió, cuánto y cómo le sentó.')}</div>`}

    <section class="section" aria-labelledby="foods-h">
      <div class="section-head"><h2 class="h-section" id="foods-h">Alimentos probados</h2><span class="subtle">${foods.length}</span></div>
      ${foods.length ? `<div class="chips" role="group" aria-label="Filtrar alimentos" style="margin-bottom:12px">
          <button class="chip ${state.foodsFilter !== 'mal' ? 'on' : ''}" data-foods-filter="todos" aria-pressed="${state.foodsFilter !== 'mal'}">Todos</button>
          <button class="chip ${state.foodsFilter === 'mal' ? 'on' : ''}" data-foods-filter="mal" aria-pressed="${state.foodsFilter === 'mal'}">No le sentaron bien</button>
        </div>
        ${shownFoods.length ? `<div class="card" style="padding:4px 14px"><ul class="list">${shownFoods.map((f) => `<li><button class="food-row" data-food="${esc(f.name)}" aria-label="${esc(f.name)}: ${f.count} veces. Registrar otra vez">
            <span class="food-main"><span class="row-title">${esc(f.name)}</span>
              <span class="subtle">${f.count} ${f.count === 1 ? 'vez' : 'veces'} · desde el ${fmtShortDate(dayKey(f.first))} · última: ${fmtShortDate(dayKey(f.last))}</span></span>
            ${f.worst === 'bien' ? tolPill('bien') : `<span class="pill tol-pill ${f.worst}">${icons.bell({ size: 13 })} ${f.badCount} ${f.badCount === 1 ? 'vez' : 'veces'} ${f.worst === 'mal' ? 'mal' : 'regular'}</span>`}
            <span class="row-chev">${icons.plus({ size: 16 })}</span>
          </button></li>`).join('')}</ul></div>`
        : '<p class="subtle">Ningún alimento le ha sentado mal por ahora.</p>'}`
      : '<p class="subtle">Aquí aparecerán los alimentos que vaya probando, con cuántas veces y si alguno no le sentó bien.</p>'}
    </section>

    <div class="note-box">${icons.heart({ size: 18 })}<span>Un registro para recordar cómo van los sólidos. Si un alimento le sienta mal, coméntalo con su pediatra. Ante dificultad para respirar, hinchazón de labios o cara, o vómitos repetidos, llama al 112.</span></div>
  </div>

  <div class="dock"><div class="dock-inner">
    <button class="btn btn-primary" data-action="add-solid">${icons.plus({ size: 18 })} Registrar comida</button>
  </div></div>`;
}

/** Tarjeta "Sólidos de hoy" para Hoy (solo cuando ya ha empezado con los sólidos). */
export function solidsTodayCard() {
  const all = store.all('solids');
  if (!all.length) return '';
  const list = onDay(all, dayKey());
  const sum = daySummary(list);
  const last = list[list.length - 1];
  return `<article class="card solids-card" aria-labelledby="solids-h">
    <div class="card-head"><span class="eyebrow" id="solids-h">Sólidos de hoy</span><span class="card-badge pup">${pupIcon('canela', 46)}</span></div>
    <div class="metric"><span class="metric-num tnum">${sum.count}</span><span class="metric-unit">${sum.count === 1 ? 'comida' : 'comidas'}</span></div>
    <div class="metric-sub">${last ? `Última: <strong>${esc(last.food)}</strong> a las ${fmtTime(last.at)} · ${TOLERANCE[last.tolerance].label.toLowerCase()}` : 'Todavía no ha comido sólidos hoy'}</div>
    <button class="btn btn-ghost btn-block" data-action="add-solid" style="margin-top:16px">${icons.plus({ size: 18 })} Registrar comida</button>
  </article>`;
}

/* ------------------------------------------------------------------ */
/* Formulario                                                           */
/* ------------------------------------------------------------------ */

export function openSolidForm({ record = null, forDay = null, food = '' } = {}) {
  const editing = Boolean(record);
  const st = {
    texture: record?.texture || '',
    amount: record?.amount || 'todo',
    liked: record?.liked || '',
    tolerance: record?.tolerance || 'bien',
    symptoms: [...(record?.symptoms || [])],
    firstTouched: editing,
    firstTime: record?.firstTime ?? isNewFood(store.all('solids'), food),
  };
  const now = Date.now();
  const at = record ? record.at : (!forDay || forDay === dayKey(now) ? now : combineLocal(forDay, toTimeInput(now)));
  const known = foodsSummary(store.all('solids')).map((f) => f.name);

  openSheet({
    label: editing ? 'Editar comida' : 'Registrar comida',
    render(body, close) {
      body.innerHTML = `<form novalidate autocomplete="off">
        <div class="sheet-head">
          <div class="sheet-title">${pupIcon('canela', 44)}<h2 class="h-section">${editing ? 'Editar comida' : 'Registrar comida'}</h2></div>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icons.close()}</button>
        </div>
        <div class="field"><div class="field-label"><span class="eyebrow">Cuándo</span></div>
          <div class="when">
            <label class="input-shell">${icons.calendar({ size: 18 })}<span class="sr-only">Fecha</span><input type="date" name="date" value="${toDateInput(at)}" max="${dayKey()}"></label>
            <label class="input-shell">${icons.clock({ size: 18 })}<span class="sr-only">Hora</span><input type="time" name="time" value="${toTimeInput(at)}"></label>
          </div></div>

        <div class="field"><div class="field-label"><span class="eyebrow">¿Qué comió?</span></div>
          <label class="input-shell">${icons.spoon({ size: 18 })}<span class="sr-only">Alimento</span>
            <input name="food" list="foods-known" maxlength="60" placeholder="Ej. Puré de calabaza" value="${esc(record?.food || food)}"></label>
          <datalist id="foods-known">${known.map((f) => `<option value="${esc(f)}">`).join('')}</datalist>
          <label class="remember first-time" style="margin-top:10px"><input type="checkbox" name="firstTime">
            <span><strong>Primera vez que lo prueba</strong><br><span class="subtle" data-first-hint></span></span></label></div>

        <div class="field"><div class="field-label"><span class="eyebrow">Textura</span><span class="field-hint">Opcional</span></div>
          <div class="chips">${Object.entries(TEXTURES).map(([k, l]) => `<button type="button" class="chip" data-texture="${k}" aria-pressed="false">${l}</button>`).join('')}</div></div>

        <div class="field"><div class="field-label"><span class="eyebrow">¿Cuánto comió?</span></div>
          <div class="amount-scale" role="radiogroup" aria-label="Cuánto comió">
            ${Object.entries(AMOUNTS).map(([k, a]) => `<button type="button" role="radio" class="scale-opt" data-amount="${k}">${amountDots(k)}<span>${a.label}</span></button>`).join('')}
          </div></div>

        <div class="field"><div class="field-label"><span class="eyebrow">¿Le gustó?</span><span class="field-hint">Opcional</span></div>
          <div class="chips">${Object.entries(LIKES).map(([k, l]) => `<button type="button" class="chip" data-liked="${k}" aria-pressed="false">${l}</button>`).join('')}</div></div>

        <div class="field"><div class="field-label"><span class="eyebrow">¿Cómo le sentó?</span></div>
          <div class="cons tol-opts" role="radiogroup" aria-label="Cómo le sentó">
            ${Object.entries(TOLERANCE).map(([k, t]) => `<button type="button" role="radio" class="cons-opt tol-opt ${k}" data-tol="${k}">
              <span class="tick">${icons.check({ size: 13 })}</span>
              <span class="tol-face">${k === 'bien' ? '😊' : k === 'regular' ? '😐' : '😣'}</span><span class="lbl">${t.short}</span></button>`).join('')}
          </div>
          <div class="symptoms-field" hidden>
            <div class="field-label" style="margin-top:14px"><span class="eyebrow">¿Qué notaste?</span><span class="field-hint">Puedes marcar varios</span></div>
            <div class="chips">${SYMPTOMS.map((x) => `<button type="button" class="chip" data-symptom="${x}" aria-pressed="false">${x}</button>`).join('')}</div>
          </div></div>

        <div class="field"><div class="field-label"><span class="eyebrow">Notas</span><span class="field-hint">Opcional</span></div>
          <textarea class="notes" name="notes" rows="2" maxlength="500" placeholder="Cantidad, cómo lo preparaste, si tenía hambre…">${esc(record?.notes || '')}</textarea></div>

        <p class="form-error" role="alert"></p>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-block">${icons.check({ size: 18 })} ${editing ? 'Guardar cambios' : 'Guardar comida'}</button>
          ${editing ? `<button type="button" class="btn btn-danger btn-block" data-delete>${icons.trash({ size: 18 })} Eliminar comida</button>` : ''}
        </div>
      </form>`;

      const form = $('form', body);
      const err = $('.form-error', form);
      const sync = () => {
        const mark = (sel, attr, val) => $$(sel, form).forEach((b) => { const on = b.dataset[attr] === val; b.classList.toggle('on', on); b.setAttribute(b.getAttribute('role') === 'radio' ? 'aria-checked' : 'aria-pressed', on); });
        mark('[data-texture]', 'texture', st.texture);
        mark('[data-amount]', 'amount', st.amount);
        mark('[data-liked]', 'liked', st.liked);
        mark('[data-tol]', 'tol', st.tolerance);
        $$('[data-symptom]', form).forEach((b) => { const on = st.symptoms.includes(b.dataset.symptom); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
        $('.symptoms-field', form).hidden = st.tolerance === 'bien';
        form.firstTime.checked = st.firstTime;
        $('[data-first-hint]', form).textContent = st.firstTime ? 'Saldrá marcado como alimento nuevo' : 'Ya lo había probado antes';
        err.textContent = '';
      };
      form.food.addEventListener('input', () => {
        if (!st.firstTouched) { st.firstTime = isNewFood(store.all('solids'), form.food.value, record?.id); sync(); }
      });
      form.firstTime.addEventListener('change', () => { st.firstTouched = true; st.firstTime = form.firstTime.checked; sync(); });
      form.addEventListener('click', async (e) => {
        const tx = e.target.closest('[data-texture]');
        if (tx) { st.texture = st.texture === tx.dataset.texture ? '' : tx.dataset.texture; sync(); }
        const am = e.target.closest('[data-amount]');
        if (am) { st.amount = am.dataset.amount; sync(); }
        const lk = e.target.closest('[data-liked]');
        if (lk) { st.liked = st.liked === lk.dataset.liked ? '' : lk.dataset.liked; sync(); }
        const tl = e.target.closest('[data-tol]');
        if (tl) { st.tolerance = tl.dataset.tol; if (st.tolerance === 'bien') st.symptoms = []; sync(); }
        const sy = e.target.closest('[data-symptom]');
        if (sy) { const v = sy.dataset.symptom; st.symptoms = st.symptoms.includes(v) ? st.symptoms.filter((x) => x !== v) : [...st.symptoms, v]; sync(); }
        if (e.target.closest('[data-delete]')) {
          const ok = await confirmDialog({ title: '¿Eliminar esta comida?', message: 'Se borrará en todos los dispositivos.', confirmLabel: 'Eliminar' });
          if (!ok) return;
          await store.remove('solids', record.id);
          close();
          toast('Comida eliminada');
        }
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          at: form.date.value && form.time.value ? combineLocal(form.date.value, form.time.value) : NaN,
          food: form.food.value.trim().replace(/\s+/g, ' '),
          firstTime: st.firstTime, texture: st.texture, amount: st.amount, liked: st.liked,
          tolerance: st.tolerance, symptoms: st.tolerance === 'bien' ? [] : st.symptoms, notes: form.notes.value.trim(),
        };
        let msg = validateSolid(data);
        if (!msg && data.at > Date.now() + FUTURE_SLACK_MS) msg = 'La hora indicada todavía no ha llegado.';
        if (msg) { err.textContent = msg; return; }
        await store.save('solids', editing ? { ...data, id: record.id } : data);
        close();
        toast(editing ? 'Comida actualizada' : `${data.food}: guardado`);
        if (data.tolerance === 'mal' && (!editing || record.tolerance !== 'mal')) {
          confirmDialog({
            title: 'Le ha sentado mal',
            message: `Queda apuntado que ${data.food} le sentó mal${data.symptoms.length ? ` (${data.symptoms.join(', ').toLowerCase()})` : ''}. Coméntalo con su pediatra.\n\nSi notas dificultad para respirar, hinchazón de labios o cara, o vómitos repetidos, llama al 112.`,
            confirmLabel: 'Entendido', cancelLabel: 'Cerrar', danger: false,
          });
        }
      });
      sync();
    },
  });
}

export { foodKey };
