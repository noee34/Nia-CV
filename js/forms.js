// Formularios de registro: biberón y deposición (crear, editar, eliminar).
import { store } from './store.js';
import { icons, consistencyIcon } from './art.js';
import { pupIcon } from './characters.js';
import { openSheet, confirmDialog, toast, esc, $, $$ } from './ui.js';
import { combineLocal, toDateInput, toTimeInput, dayKey } from './dates.js';
import { validateBottle, validatePoop, CONSISTENCIES } from './stats.js';

const FUTURE_SLACK_MS = 5 * 60000;

/** Fecha/hora por defecto: ahora, o la hora actual en el día que se está consultando. */
function defaultWhen(forDay) {
  const now = new Date();
  if (!forDay || forDay === dayKey(now)) return now.getTime();
  return combineLocal(forDay, toTimeInput(now.getTime()));
}

function whenFields(at) {
  return `<div class="field">
    <div class="field-label"><span class="eyebrow">Cuándo</span></div>
    <div class="when">
      <label class="input-shell">${icons.calendar({ size: 18 })}<span class="sr-only">Fecha</span>
        <input type="date" name="date" value="${toDateInput(at)}" max="${dayKey()}" required></label>
      <label class="input-shell">${icons.clock({ size: 18 })}<span class="sr-only">Hora</span>
        <input type="time" name="time" value="${toTimeInput(at)}" required></label>
    </div>
    <div class="shortcuts" role="group" aria-label="Atajos de hora">
      <button type="button" class="chip" data-ago="0">Ahora</button>
      <button type="button" class="chip" data-ago="15">Hace 15 min</button>
      <button type="button" class="chip" data-ago="30">Hace 30 min</button>
      <button type="button" class="chip" data-ago="60">Hace 1 h</button>
    </div>
  </div>`;
}

function bindWhen(form) {
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ago]');
    if (!b) return;
    const t = Date.now() - Number(b.dataset.ago) * 60000;
    form.date.value = toDateInput(t);
    form.time.value = toTimeInput(t);
  });
}

function readWhen(form) {
  if (!form.date.value || !form.time.value) return NaN;
  return combineLocal(form.date.value, form.time.value);
}

function notesField(value, placeholder, extra = '') {
  const open = Boolean(value);
  return `<div class="field notes-field" ${open ? '' : 'hidden'}>
      <div class="field-label"><span class="eyebrow">Observaciones</span><span class="field-hint">Opcional</span></div>
      ${extra}
      <textarea class="notes" name="notes" rows="3" maxlength="500" placeholder="${esc(placeholder)}">${esc(value)}</textarea>
    </div>
    <button type="button" class="link-btn toggle-notes" ${open ? 'hidden' : ''}>${icons.plus({ size: 16 })} Añadir observación</button>`;
}

function bindNotes(form) {
  const btn = $('.toggle-notes', form);
  btn?.addEventListener('click', () => {
    $('.notes-field', form).hidden = false;
    btn.hidden = true;
    form.notes.focus();
  });
}

async function confirmDelete(type, id, close) {
  const isBottle = type === 'bottles';
  const ok = await confirmDialog({
    title: isBottle ? '¿Eliminar este biberón?' : '¿Eliminar esta deposición?',
    message: 'El registro se borrará de este dispositivo y los totales se recalcularán.',
  });
  if (!ok) return;
  await store.remove(type, id);
  close();
  toast(isBottle ? 'Biberón eliminado' : 'Deposición eliminada');
}

/* ------------------------------------------------------------------ */
/* Biberón                                                             */
/* ------------------------------------------------------------------ */

export function openBottleForm({ record = null, forDay = null } = {}) {
  const editing = Boolean(record);
  const s = store.settings;
  const state = {
    prepared: record ? record.prepared : (s.lastPrepared ?? null),
    taken: record ? record.taken : null,
    preparedTouched: editing,
  };
  const at = record ? record.at : defaultWhen(forDay);
  const amounts = [...s.quickAmounts].sort((a, b) => a - b);

  openSheet({
    label: editing ? 'Editar biberón' : 'Nuevo biberón',
    render(body, close) {
      body.innerHTML = `<form novalidate autocomplete="off">
        <div class="sheet-head">
          <div class="sheet-title">${pupIcon('nube', 44)}<h2 class="h-section">${editing ? 'Editar biberón' : 'Nuevo biberón'}</h2></div>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icons.close()}</button>
        </div>

        ${whenFields(at)}

        <div class="field">
          <div class="field-label"><span class="eyebrow" id="lbl-taken">Tomado</span><span class="field-hint">Lo que bebió realmente</span></div>
          <div class="amount" role="group" aria-labelledby="lbl-taken">
            <button type="button" class="step" data-step="taken" data-d="-10" aria-label="Restar 10 ml">${icons.minus()}</button>
            <label class="amount-input"><span class="sr-only">Mililitros tomados</span>
              <input name="taken" type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="1000" placeholder="—" value="${state.taken ?? ''}"><span>ml</span></label>
            <button type="button" class="step" data-step="taken" data-d="10" aria-label="Sumar 10 ml">${icons.plus()}</button>
          </div>
          <div class="quick" role="group" aria-label="Cantidades rápidas">
            ${amounts.map((v) => `<button type="button" data-quick="${v}" aria-pressed="false">${v} ml</button>`).join('')}
          </div>
        </div>

        <div class="field">
          <div class="field-label"><span class="eyebrow" id="lbl-prep">Preparado</span><span class="field-hint">Leche en el biberón</span></div>
          <div class="amount sm" role="group" aria-labelledby="lbl-prep">
            <button type="button" class="step" data-step="prepared" data-d="-10" aria-label="Restar 10 ml">${icons.minus({ size: 18 })}</button>
            <label class="amount-input"><span class="sr-only">Mililitros preparados</span>
              <input name="prepared" type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="1000" placeholder="—" value="${state.prepared ?? ''}"><span>ml</span></label>
            <button type="button" class="step" data-step="prepared" data-d="10" aria-label="Sumar 10 ml">${icons.plus({ size: 18 })}</button>
          </div>
        </div>

        ${notesField(record?.notes || '', 'Por ejemplo: se quedó dormida a mitad de la toma')}

        <p class="form-error" role="alert"></p>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-block">${icons.check({ size: 18 })} ${editing ? 'Guardar cambios' : 'Guardar biberón'}</button>
          ${editing ? `<button type="button" class="btn btn-danger btn-block" data-delete>${icons.trash({ size: 18 })} Eliminar biberón</button>` : ''}
        </div>
        <p class="subtle" style="text-align:center;margin-top:10px">Las cantidades rápidas son atajos configurables, no una recomendación.</p>
      </form>`;

      const form = $('form', body);
      const errEl = $('.form-error', form);
      bindWhen(form);
      bindNotes(form);

      const num = (v) => (v === '' || v == null ? null : Math.max(0, Math.min(1000, Math.round(Number(v)))));
      const sync = () => {
        if (document.activeElement !== form.taken) form.taken.value = state.taken ?? '';
        if (document.activeElement !== form.prepared) form.prepared.value = state.prepared ?? '';
        $$('[data-quick]', form).forEach((b) => {
          const on = Number(b.dataset.quick) === state.taken;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on);
        });
        errEl.textContent = '';
      };
      const setTaken = (v) => {
        state.taken = v;
        // Si no se ha tocado "preparado", que nunca quede por debajo de lo tomado.
        if (!state.preparedTouched && v != null && (state.prepared == null || state.prepared < v)) state.prepared = v;
        sync();
      };

      form.addEventListener('click', (e) => {
        const q = e.target.closest('[data-quick]');
        if (q) setTaken(Number(q.dataset.quick));
        const st = e.target.closest('[data-step]');
        if (st) {
          const key = st.dataset.step;
          const next = num((state[key] ?? 0) + Number(st.dataset.d));
          if (key === 'taken') setTaken(next);
          else { state.preparedTouched = true; state.prepared = next; sync(); }
        }
        if (e.target.closest('[data-delete]')) confirmDelete('bottles', record.id, close);
      });
      form.taken.addEventListener('input', () => setTaken(num(form.taken.value)));
      form.prepared.addEventListener('input', () => { state.preparedTouched = true; state.prepared = num(form.prepared.value); sync(); });
      form.taken.addEventListener('blur', sync);
      form.prepared.addEventListener('blur', sync);

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          at: readWhen(form),
          prepared: state.prepared ?? NaN,
          taken: state.taken ?? NaN,
          notes: form.notes.value.trim(),
        };
        let err = validateBottle(data);
        if (!err && data.at > Date.now() + FUTURE_SLACK_MS) err = 'La hora indicada todavía no ha llegado.';
        if (err) { errEl.textContent = err; return; }
        try {
          await store.save('bottles', editing ? { ...data, id: record.id } : data);
          if (data.prepared !== s.lastPrepared) store.updateSettings({ lastPrepared: data.prepared });
          close();
          toast(editing ? 'Cambios guardados' : `Biberón guardado · ${data.taken} ml`);
        } catch (ex) {
          console.error(ex);
          errEl.textContent = 'No se pudo guardar. Inténtalo de nuevo.';
        }
      });
      sync();
    },
  });
}

/* ------------------------------------------------------------------ */
/* Deposición                                                          */
/* ------------------------------------------------------------------ */

const NOTE_TAGS = ['Poca cantidad', 'Abundante', 'Amarilla', 'Verdosa', 'Marrón', 'Con grumos'];

export function openPoopForm({ record = null, forDay = null } = {}) {
  const editing = Boolean(record);
  let consistency = record?.consistency || null;
  const at = record ? record.at : defaultWhen(forDay);

  const opt = (key, sub) => `<button type="button" class="cons-opt" data-cons="${key}" aria-pressed="false">
      <span class="tick">${icons.check({ size: 13 })}</span>${consistencyIcon[key](40)}
      <span class="lbl">${CONSISTENCIES[key].label}</span><span class="sub">${sub}</span></button>`;

  openSheet({
    label: editing ? 'Editar deposición' : 'Registrar caca',
    render(body, close) {
      body.innerHTML = `<form novalidate autocomplete="off">
        <div class="sheet-head">
          <div class="sheet-title">${pupIcon('canela', 44)}<h2 class="h-section">${editing ? 'Editar deposición' : 'Registrar caca'}</h2></div>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icons.close()}</button>
        </div>

        ${whenFields(at)}

        <div class="field">
          <div class="field-label"><span class="eyebrow">Consistencia</span></div>
          <div class="cons" role="group" aria-label="Consistencia">
            ${opt('blanda', 'Suave')}${opt('normal', 'Redondeada')}${opt('dura', 'Bolitas')}
          </div>
          <button type="button" class="cons-opt cons-extra" data-cons="liquida" aria-pressed="false">
            <span class="tick">${icons.check({ size: 13 })}</span>${consistencyIcon.liquida(36)}
            <span class="txt"><span class="lbl">Muy líquida</span><span class="sub">Opcional, para distinguirla de blanda</span></span>
          </button>
        </div>

        ${notesField(record?.notes || '', 'Cantidad, color, textura… lo que quieras recordar',
          `<div class="chips" style="margin-bottom:10px">${NOTE_TAGS.map((t) => `<button type="button" class="chip" data-tag="${t}">${t}</button>`).join('')}</div>`)}

        <p class="form-error" role="alert"></p>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-block" data-save>${icons.check({ size: 18 })} ${editing ? 'Guardar cambios' : 'Guardar deposición'}</button>
          ${editing ? `<button type="button" class="btn btn-danger btn-block" data-delete>${icons.trash({ size: 18 })} Eliminar deposición</button>` : ''}
        </div>
      </form>`;

      const form = $('form', body);
      const errEl = $('.form-error', form);
      bindWhen(form);
      bindNotes(form);

      const sync = () => {
        $$('[data-cons]', form).forEach((b) => {
          const on = b.dataset.cons === consistency;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on);
        });
        errEl.textContent = '';
      };

      form.addEventListener('click', (e) => {
        const c = e.target.closest('[data-cons]');
        if (c) { consistency = c.dataset.cons; sync(); }
        const t = e.target.closest('[data-tag]');
        if (t) {
          const cur = form.notes.value.trim();
          const tag = t.dataset.tag;
          if (!cur.toLowerCase().includes(tag.toLowerCase())) form.notes.value = cur ? `${cur}, ${tag.toLowerCase()}` : tag;
        }
        if (e.target.closest('[data-delete]')) confirmDelete('poops', record.id, close);
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = { at: readWhen(form), consistency, notes: form.notes.value.trim() };
        let err = validatePoop(data);
        if (!err && data.at > Date.now() + FUTURE_SLACK_MS) err = 'La hora indicada todavía no ha llegado.';
        if (err) { errEl.textContent = err; return; }
        try {
          await store.save('poops', editing ? { ...data, id: record.id } : data);
          close();
          toast(editing ? 'Cambios guardados' : 'Deposición guardada');
        } catch (ex) {
          console.error(ex);
          errEl.textContent = 'No se pudo guardar. Inténtalo de nuevo.';
        }
      });
      sync();
    },
  });
}
