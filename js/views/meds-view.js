// MEDICACIÓN: medicamentos y vitaminas con sus horas de toma, tarjeta en Hoy,
// aviso al llegar la hora, botón de WhatsApp y alarmas diarias del iPhone.
import { store } from '../store.js';
import { icons } from '../art.js';
import { pupIcon } from '../characters.js';
import { openSheet, confirmDialog, toast, esc, $, $$ } from '../ui.js';
import { dayKey, fmtShortDate, fmtTime } from '../dates.js';
import {
  MED_TYPES, DEFAULT_WHATSAPP_TEMPLATE, TEMPLATE_FIELDS, validateMed, dosesForDay, doseStatus,
  fillTemplate, whatsappLink, medsICS,
} from '../meds.js';

const STATUS = {
  dada: 'Dada',
  ahora: 'Toca ahora',
  retrasada: 'Sin dar',
  pendiente: 'Pendiente',
};

export const todayDoses = (key = dayKey()) => dosesForDay(store.all('meds'), store.all('medlog'), key);
const findDose = (key) => todayDoses(key.split('|')[1]).find((d) => d.key === key);
const whoAmI = () => (store.account ? store.account.split('@')[0] : '');

/** Texto del mensaje de WhatsApp para una toma (plantilla editable en la pestaña Nia). */
export function doseWhatsApp(dose) {
  const text = fillTemplate(store.settings.waTemplate || DEFAULT_WHATSAPP_TEMPLATE, {
    baby: store.settings.babyName || 'Nia', med: dose.med, time: dose.time,
  });
  return whatsappLink(text, store.settings.waPhone || '');
}

function doseRow(d, now = Date.now()) {
  const st = doseStatus(d, now);
  const meta = st === 'dada'
    ? `Dada a las ${fmtTime(d.log.givenAt)}${d.log.by ? ` · por ${esc(d.log.by)}` : ''}`
    : `${d.med.dose ? `${esc(d.med.dose)} · ` : ''}${STATUS[st]}`;
  return `<li class="dose-row ${st}">
    <span class="dose-time">${d.time}</span>
    <span class="dose-main"><span class="dose-name">${esc(d.med.name)}</span><span class="dose-meta">${meta}</span></span>
    <span class="dose-actions">
      ${st === 'dada'
        ? `<button class="dose-done" data-undo-dose="${esc(d.key)}" aria-label="${esc(d.med.name)} de las ${d.time}: dada. Tocar para deshacer">${icons.check({ size: 16 })}</button>`
        : `<a class="icon-btn wa-btn" href="${esc(doseWhatsApp(d))}" target="_blank" rel="noopener" aria-label="Enviar recordatorio por WhatsApp">${icons.whatsapp({ size: 20 })}</a>
           <button class="btn btn-sm ${st === 'pendiente' ? 'btn-ghost' : 'btn-primary'}" data-give-dose="${esc(d.key)}">Dar ✓</button>`}
    </span>
  </li>`;
}

/** Tarjeta "Medicación de hoy" para la pantalla Hoy (vacía si hoy no hay tomas). */
export function todayMedsCard() {
  const doses = todayDoses();
  if (!doses.length) return '';
  const now = Date.now();
  const given = doses.filter((d) => d.log).length;
  // Primero la que toca ahora; después las que se quedaron sin dar
  const nowDoses = doses.filter((d) => doseStatus(d, now) === 'ahora');
  const late = doses.filter((d) => doseStatus(d, now) === 'retrasada');
  const urgent = [...nowDoses, ...late];
  return `<article class="card meds-card ${urgent.length ? 'urgent' : ''}" aria-labelledby="meds-h">
    ${urgent.length ? `<div class="meds-alert" role="status">${icons.bell({ size: 18 })}
      <span><strong>${urgent[0].time} · ${esc(urgent[0].med.name)}</strong>${urgent[0].med.dose ? ` (${esc(urgent[0].med.dose)})` : ''}
      ${nowDoses.length ? '— toca ahora' : '— todavía sin dar'}${nowDoses.length > 1 ? ` · y ${nowDoses.length - 1} más ahora` : ''}${nowDoses.length && late.length ? ` · ${late.length} sin dar antes` : ''}${!nowDoses.length && late.length > 1 ? ` · y ${late.length - 1} más` : ''}</span></div>` : ''}
    <div class="card-head"><span class="eyebrow" id="meds-h">Medicación de hoy</span>
      <span class="subtle">${given} de ${doses.length} ${doses.length === 1 ? 'dada' : 'dadas'}</span></div>
    <ul class="list dose-list">${doses.map((d) => doseRow(d, now)).join('')}</ul>
  </article>`;
}

/** Apartado Medicación dentro de la pestaña Medicina. */
export function renderMedsSection() {
  const meds = [...store.all('meds')].sort((a, b) => Number(a.paused) - Number(b.paused) || a.name.localeCompare(b.name));
  const doses = todayDoses();
  const today = dayKey();
  const period = (m) => {
    const from = m.startDate > today ? `Empieza el ${fmtShortDate(m.startDate)}` : `Desde el ${fmtShortDate(m.startDate)}`;
    if (!m.endDate) return `${from} · sin fecha de fin`;
    return m.endDate < today ? `Terminó el ${fmtShortDate(m.endDate)}` : `${from} · hasta el ${fmtShortDate(m.endDate)}`;
  };
  return `
  <section class="section" aria-labelledby="mtoday-h" style="margin-top:20px">
    <div class="section-head"><h2 class="h-section" id="mtoday-h">Tomas de hoy</h2></div>
    ${doses.length
      ? `<div class="card" style="padding:4px 14px"><ul class="list dose-list">${doses.map((d) => doseRow(d)).join('')}</ul></div>`
      : '<p class="subtle">Hoy no hay ninguna toma programada.</p>'}
  </section>

  <section class="section" aria-labelledby="mlist-h">
    <div class="section-head"><h2 class="h-section" id="mlist-h">Medicación y vitaminas</h2>
      ${meds.some((m) => !m.paused) ? `<button class="link-btn" data-action="med-cal-all">${icons.calendar({ size: 15 })} Todas al Calendario</button>` : ''}</div>
    ${meds.length ? meds.map((m) => `<button class="card med-card ${m.paused ? 'paused' : ''}" data-med="${m.id}" aria-label="${esc(m.name)}. Editar">
        <span class="card-badge ${m.type === 'vitamina' ? '' : 'terra'}">${m.type === 'vitamina' ? icons.star({ size: 20 }) : icons.pill({ size: 20 })}</span>
        <span class="med-main">
          <span class="med-name">${esc(m.name)}</span>
          <span class="subtle">${MED_TYPES[m.type]?.label || ''}${m.dose ? ` · ${esc(m.dose)}` : ''}${m.paused ? ' · En pausa' : ''}</span>
          <span class="med-times">${[...m.times].sort().map((t) => `<span class="pill">${icons.bell({ size: 13 })} ${t}</span>`).join('')}</span>
          <span class="subtle">${period(m)}</span>
        </span>
        <span class="row-chev">${icons.right({ size: 18 })}</span>
      </button>`).join('')
      : `<div class="card empty-cita">${pupIcon('canela', 64)}<div><div class="empty-title" style="font-size:1.15rem">Sin medicación</div>
          <div class="empty-sub">Pulsa “Añadir medicación” para apuntar un medicamento o una vitamina con sus horas.</div></div></div>`}
  </section>

  <div class="note-box">${icons.bell({ size: 18 })}<span>Para que el iPhone avise cada día aunque la app esté cerrada, abre la medicación y pulsa <strong>Añadir alarmas al Calendario</strong>. El botón de WhatsApp abre el mensaje ya escrito; el texto se cambia en la pestaña ${esc((store.settings.babyName || 'Nia').split(' ')[0])}.</span></div>

  <div class="dock"><div class="dock-inner">
    <button class="btn btn-primary" data-action="add-med">${icons.plus({ size: 18 })} Añadir medicación</button>
  </div></div>`;
}

/* ------------------------------------------------------------------ */
/* Dar una toma, deshacer, avisos                                       */
/* ------------------------------------------------------------------ */

export async function giveDose(key) {
  const d = findDose(key);
  if (!d || d.log) return;
  await store.save('medlog', { medId: d.med.id, dose: d.key, at: d.at, givenAt: Date.now(), by: whoAmI() });
  toast(`${d.med.name}: dada ✓`);
}

export async function undoDose(key) {
  const d = findDose(key);
  if (!d?.log) return;
  const ok = await confirmDialog({ title: '¿Marcar como no dada?', message: `${d.med.name} de las ${d.time} volverá a aparecer como pendiente.`, confirmLabel: 'Marcar como no dada' });
  if (!ok) return;
  await store.remove('medlog', d.log.id);
  toast('Toma desmarcada');
}

/** Aviso al llegar la hora: marcar como dada, WhatsApp o más tarde. */
export function showDoseAlert(doses) {
  if (!doses.length || document.querySelector('.dialog-root')) return;
  const d = doses[0];
  const root = document.createElement('div');
  root.className = 'dialog-root';
  root.innerHTML = `<div class="sheet-backdrop" data-later></div>
    <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dose-t">
      <div class="dose-alert-icon">${pupIcon('nube', 64)}</div>
      <h3 id="dose-t">Es la hora de la medicación</h3>
      <p><strong>${d.time} · ${esc(d.med.name)}</strong>${d.med.dose ? `\n${esc(d.med.dose)}` : ''}${doses.length > 1 ? `\n\nY ${doses.length - 1} ${doses.length - 1 === 1 ? 'toma más' : 'tomas más'}: ${doses.slice(1, 4).map((x) => `${x.time} ${esc(x.med.name)}`).join(', ')}` : ''}</p>
      <button class="btn btn-primary" data-give>✓ Marcar como dada</button>
      <a class="btn btn-whatsapp" href="${esc(doseWhatsApp(d))}" target="_blank" rel="noopener" data-wa>${icons.whatsapp({ size: 20 })} Enviar por WhatsApp</a>
      <button class="btn btn-ghost" data-later>Más tarde</button>
    </div>`;
  document.body.appendChild(root);
  const close = () => root.remove();
  root.addEventListener('click', async (e) => {
    if (e.target.closest('[data-give]')) { close(); await giveDose(d.key); }
    else if (e.target.closest('[data-wa]')) setTimeout(close, 300);
    else if (e.target.closest('[data-later]')) close();
  });
  $('[data-give]', root).focus();
}

/* ------------------------------------------------------------------ */
/* Calendario del iPhone                                                */
/* ------------------------------------------------------------------ */

export async function addMedsToCalendar(meds) {
  const list = meds.filter((m) => !m.paused);
  if (!list.length) return;
  const ics = medsICS(list, { babyName: store.settings.babyName || 'Nia' });
  const name = 'medicacion-nia.ics';
  if (typeof globalThis.claude?.use === 'function') {
    const dl = await globalThis.claude.use('downloads').catch(() => null);
    if (dl) { try { await dl.save({ filename: name, data: ics }); } catch { /* cancelado */ } }
    return;
  }
  const a = Object.assign(document.createElement('a'), { href: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`, target: '_blank', rel: 'noopener', download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Abriendo el Calendario…');
}

/* ------------------------------------------------------------------ */
/* Formulario de medicación                                             */
/* ------------------------------------------------------------------ */

const PRESETS = [
  ['1 vez', ['09:00']],
  ['2 veces', ['09:00', '21:00']],
  ['3 veces', ['08:00', '14:00', '20:00']],
];

export function openMedForm({ record = null } = {}) {
  const editing = Boolean(record);
  const st = { type: record?.type || 'vitamina', times: record ? [...record.times].sort() : ['09:00'] };
  openSheet({
    label: editing ? 'Editar medicación' : 'Nueva medicación',
    render(body, close) {
      body.innerHTML = `<form novalidate autocomplete="off">
        <div class="sheet-head">
          <div class="sheet-title">${pupIcon('canela', 44)}<h2 class="h-section">${editing ? 'Editar medicación' : 'Nueva medicación'}</h2></div>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icons.close()}</button>
        </div>
        <div class="segmented" role="radiogroup" aria-label="Tipo">
          ${Object.entries(MED_TYPES).map(([id, t]) => `<button type="button" role="radio" data-mtype="${id}">${t.label}</button>`).join('')}
        </div>
        <div class="field"><div class="field-label"><span class="eyebrow">Nombre</span></div>
          <label class="input-shell">${icons.pill({ size: 18 })}<span class="sr-only">Nombre</span><input name="name" maxlength="60" placeholder="Ej. Vitamina D" value="${esc(record?.name || '')}"></label></div>
        <div class="field"><div class="field-label"><span class="eyebrow">Dosis</span><span class="field-hint">Opcional</span></div>
          <label class="input-shell"><span class="sr-only">Dosis</span><input name="dose" maxlength="60" placeholder="Ej. 5 gotas · 2,5 ml" value="${esc(record?.dose || '')}"></label></div>
        <div class="field"><div class="field-label"><span class="eyebrow">Horas de toma</span><span class="field-hint">Avisa a cada hora</span></div>
          <div class="chips" style="margin-bottom:10px">${PRESETS.map(([l], i) => `<button type="button" class="chip" data-preset="${i}">${l} al día</button>`).join('')}</div>
          <div class="chips times-list"></div>
          <div class="add-amount" style="padding:10px 0 0"><input type="time" name="newTime" value="12:00" aria-label="Nueva hora">
            <button type="button" class="btn btn-ghost btn-sm" data-add-time>${icons.plus({ size: 16 })} Añadir hora</button></div></div>
        <div class="field"><div class="field-label"><span class="eyebrow">Desde · hasta</span><span class="field-hint">Deja “hasta” vacío si no tiene fin</span></div>
          <div class="when">
            <label class="input-shell">${icons.calendar({ size: 18 })}<span class="sr-only">Desde</span><input type="date" name="start" value="${record?.startDate || dayKey()}"></label>
            <label class="input-shell">${icons.calendar({ size: 18 })}<span class="sr-only">Hasta</span><input type="date" name="end" value="${record?.endDate || ''}"></label>
          </div></div>
        <div class="field"><div class="field-label"><span class="eyebrow">Notas</span><span class="field-hint">Opcional</span></div>
          <textarea class="notes" name="notes" rows="2" maxlength="500" placeholder="Con el biberón, agitar antes de usar…">${esc(record?.notes || '')}</textarea></div>
        <p class="form-error" role="alert"></p>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-block">${icons.check({ size: 18 })} ${editing ? 'Guardar cambios' : 'Guardar medicación'}</button>
          ${editing ? `
            <button type="button" class="btn btn-blue btn-block" data-med-ics>${icons.calendar({ size: 18 })} Añadir alarmas al Calendario</button>
            <button type="button" class="btn btn-ghost btn-block" data-pause>${record.paused ? 'Reanudar' : 'Pausar (sin borrar)'}</button>
            <button type="button" class="btn btn-danger btn-block" data-delete>${icons.trash({ size: 18 })} Eliminar medicación</button>` : ''}
        </div>
      </form>`;
      const form = $('form', body);
      const err = $('.form-error', form);
      const sync = () => {
        $$('[data-mtype]', form).forEach((b) => { const on = b.dataset.mtype === st.type; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
        $('.times-list', form).innerHTML = st.times.length
          ? st.times.map((t) => `<span class="chip on">${icons.bell({ size: 14 })} ${t}<button type="button" data-rm-time="${t}" aria-label="Quitar ${t}">${icons.close({ size: 13 })}</button></span>`).join('')
          : '<span class="subtle">Añade al menos una hora.</span>';
        err.textContent = '';
      };
      form.addEventListener('click', async (e) => {
        const ty = e.target.closest('[data-mtype]');
        if (ty) { st.type = ty.dataset.mtype; sync(); }
        const p = e.target.closest('[data-preset]');
        if (p) { st.times = [...PRESETS[Number(p.dataset.preset)][1]]; sync(); }
        const rm = e.target.closest('[data-rm-time]');
        if (rm) { st.times = st.times.filter((t) => t !== rm.dataset.rmTime); sync(); }
        if (e.target.closest('[data-add-time]')) {
          const t = form.newTime.value;
          if (/^\d\d:\d\d$/.test(t) && !st.times.includes(t)) { st.times = [...st.times, t].sort(); sync(); }
        }
        if (e.target.closest('[data-med-ics]')) addMedsToCalendar([store.get('meds', record.id) || record]);
        if (e.target.closest('[data-pause]')) {
          await store.save('meds', { id: record.id, paused: !record.paused });
          close();
          toast(record.paused ? 'Medicación reanudada' : 'Medicación en pausa');
        }
        if (e.target.closest('[data-delete]')) {
          const ok = await confirmDialog({ title: `¿Eliminar ${record.name}?`, message: 'Dejará de aparecer en Hoy y en los avisos de todos los dispositivos. Si añadiste sus alarmas al Calendario del iPhone, bórralas también allí.', confirmLabel: 'Eliminar' });
          if (!ok) return;
          await store.remove('meds', record.id);
          close();
          toast('Medicación eliminada');
        }
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          name: form.name.value.trim(), type: st.type, dose: form.dose.value.trim(), times: [...st.times],
          startDate: form.start.value, endDate: form.end.value || null, notes: form.notes.value.trim(),
          paused: record?.paused || false, at: record?.at || Date.now(),
        };
        const msg = validateMed(data);
        if (msg) { err.textContent = msg; return; }
        const saved = await store.save('meds', editing ? { ...data, id: record.id } : data);
        close();
        toast(editing ? 'Medicación actualizada' : 'Medicación guardada');
        if (!editing) {
          const ok = await confirmDialog({
            title: '¿Quieres que el iPhone te avise cada día?',
            message: `Añade las alarmas al Calendario y te avisará a las ${data.times.join(', ')} aunque la app esté cerrada.`,
            confirmLabel: 'Añadir alarmas', cancelLabel: 'Ahora no', danger: false,
          });
          if (ok) addMedsToCalendar([saved]);
        }
      });
      sync();
    },
  });
}

/* ------------------------------------------------------------------ */
/* Mensaje de WhatsApp (se edita en la pestaña Nia)                     */
/* ------------------------------------------------------------------ */

const SAMPLE = { name: 'Vitamina D', dose: '5 gotas', type: 'vitamina' };

/** Tarjeta para la pestaña Nia: vista previa del mensaje y botón para editarlo. */
export function whatsappCard() {
  const s = store.settings;
  const preview = fillTemplate(s.waTemplate || DEFAULT_WHATSAPP_TEMPLATE, { baby: s.babyName || 'Nia', med: SAMPLE, time: '09:00' });
  return `<section class="card" aria-labelledby="wa-h" style="margin-top:14px">
    <div class="card-head"><span class="eyebrow" id="wa-h">Mensaje de WhatsApp · medicación</span>
      <button class="link-btn" data-action="edit-wa" style="min-height:32px">${icons.pencil({ size: 15 })} Editar</button></div>
    <div class="wa-bubble">${esc(preview)}</div>
    <p class="subtle" style="margin:8px 0 0">${s.waPhone ? `Se abrirá el chat de ${esc(s.waPhone)}.` : 'Al pulsar el botón de WhatsApp eliges a quién enviarlo.'} Ejemplo con Vitamina D a las 09:00.</p>
  </section>`;
}

export function openWhatsAppEditor() {
  openSheet({
    label: 'Mensaje de WhatsApp',
    render(body, close) {
      const s = store.settings;
      body.innerHTML = `<form novalidate>
        <div class="sheet-head"><div class="sheet-title">${pupIcon('nube', 44)}<h2 class="h-section">Mensaje de WhatsApp</h2></div>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icons.close()}</button></div>
        <p class="subtle">Es el mensaje que se abre en WhatsApp al pulsar su botón en una toma. Toca un hueco para añadirlo: se rellena solo con los datos de cada toma.</p>
        <div class="chips" style="margin:10px 0">${TEMPLATE_FIELDS.map(([f, d]) => `<button type="button" class="chip" data-field="${f}" title="${d}">${f}</button>`).join('')}</div>
        <textarea class="notes" name="template" rows="4" maxlength="400">${esc(s.waTemplate || DEFAULT_WHATSAPP_TEMPLATE)}</textarea>
        <div class="field"><div class="field-label"><span class="eyebrow">Vista previa</span></div><div class="wa-bubble" data-preview></div></div>
        <div class="field"><div class="field-label"><span class="eyebrow">Teléfono de WhatsApp</span><span class="field-hint">Opcional</span></div>
          <label class="input-shell"><span class="sr-only">Teléfono</span><input name="phone" type="tel" inputmode="tel" maxlength="20" placeholder="Ej. +34 600 11 22 33" value="${esc(s.waPhone || '')}"></label>
          <p class="field-hint" style="margin-top:6px">Si lo pones, el mensaje se abre directamente en ese chat. Con prefijo del país (+34 en España).</p></div>
        <p class="form-error" role="alert"></p>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-block">${icons.check({ size: 18 })} Guardar mensaje</button>
          <button type="button" class="btn btn-ghost btn-block" data-reset>Volver al mensaje original</button>
        </div></form>`;
      const form = $('form', body);
      const preview = () => { $('[data-preview]', form).textContent = fillTemplate(form.template.value, { baby: store.settings.babyName || 'Nia', med: SAMPLE, time: '09:00' }); };
      form.template.addEventListener('input', preview);
      form.addEventListener('click', (e) => {
        const f = e.target.closest('[data-field]');
        if (f) {
          const t = form.template;
          const pos = t.selectionStart ?? t.value.length;
          t.value = t.value.slice(0, pos) + f.dataset.field + t.value.slice(t.selectionEnd ?? pos);
          t.focus();
          preview();
        }
        if (e.target.closest('[data-reset]')) { form.template.value = DEFAULT_WHATSAPP_TEMPLATE; preview(); }
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const template = form.template.value.trim();
        const phone = form.phone.value.trim();
        if (!template) { $('.form-error', form).textContent = 'Escribe el mensaje.'; return; }
        if (phone && phone.replace(/[^\d]/g, '').length < 8) { $('.form-error', form).textContent = 'El teléfono parece incompleto.'; return; }
        await store.updateSettings({ waTemplate: template, waPhone: phone });
        close();
        toast('Mensaje de WhatsApp guardado');
      });
      preview();
    },
  });
}
