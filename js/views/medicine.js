// Pestaña MEDICINA: citas del médico (vacuna, pediatra, revisión, receta) y de
// la especialista, con calendario, avisos y alta en el Calendario del iPhone.
import { store } from '../store.js';
import { icons } from '../art.js';
import { medicalScene, pupIcon } from '../characters.js';
import { calendarHTML, openSheet, confirmDialog, toast, esc, $, $$ } from '../ui.js';
import { dayKey, combineLocal, toDateInput, toTimeInput, fmtTime, fmtLongDate, fmtShortDate, relativeDayLabel, cap } from '../dates.js';
import { groupByDay } from '../stats.js';
import {
  SECTIONS, KINDS, DEFAULT_SPECIALIST, REMINDERS, DEFAULT_REMINDERS, reminderLabel,
  upcoming, past, citaTitle, validateCita, toICS,
} from '../medical.js';

export const kindIcon = (kind, size = 18) => ({
  vacuna: icons.syringe, pediatra: icons.stetho, revision: icons.clipboard, receta: icons.pill, especialista: icons.heart,
}[kind] || icons.medical)({ size });

const specialistName = () => store.settings.specialistName || DEFAULT_SPECIALIST;

function remindersText(list = []) {
  if (!list.length) return 'Sin avisos';
  return [...list].sort((a, b) => b - a).map((m) => reminderLabel(m).replace(' antes', '')).join(' · ') + (list.includes(0) && list.length === 1 ? '' : ' antes');
}

function citaRow(c) {
  const d = new Date(c.at);
  const key = dayKey(c.at);
  return `<li><button class="cita-row ${c.done ? 'done' : ''} ${c.section}" data-cita="${c.id}" aria-label="${esc(citaTitle(c))}, ${cap(fmtLongDate(key))} a las ${fmtTime(c.at)}. Editar">
    <span class="cita-date"><span class="cita-day">${d.getDate()}</span><span class="cita-month">${fmtShortDate(key).replace(/^\d+\s*/, '')}</span></span>
    <span class="cita-main">
      <span class="cita-title">${esc(citaTitle(c))}</span>
      <span class="cita-meta">${relativeDayLabel(key)} · ${fmtTime(c.at)}${c.place ? ` · ${esc(c.place)}` : ''}</span>
      <span class="cita-tags"><span class="pill kind-pill ${c.kind}">${kindIcon(c.kind, 14)} ${KINDS[c.kind]?.label || ''}</span>
        ${c.done ? '<span class="pill">✓ Hecha</span>' : `<span class="pill">${icons.bell({ size: 13 })} ${esc(remindersText(c.reminders))}</span>`}</span>
    </span>
    <span class="row-chev">${icons.right({ size: 18 })}</span>
  </button></li>`;
}

export function renderMedicine(state) {
  const section = state.medSection;
  const filter = state.medFilter;
  const all = store.all('citas');
  const inSection = all.filter((c) => c.section === section && (section !== 'medico' || filter === 'all' || c.kind === filter));
  const next = upcoming(inSection);
  const old = past(inSection).slice(0, state.medHistory);

  // Calendario: puntos azules = Médico, terracota = Especialista
  const marks = new Map();
  for (const [k, v] of groupByDay(all)) {
    marks.set(k, { bottles: v.filter((c) => c.section === 'medico').length, poops: v.filter((c) => c.section === 'especialista').length });
  }
  const [y, m] = state.medMonth;
  const sel = state.medSelected;
  const dayList = all.filter((c) => dayKey(c.at) === sel).sort((a, b) => a.at - b.at);

  const filters = [['all', 'Todas'], ...Object.entries(KINDS).filter(([, k]) => k.section === 'medico').map(([id, k]) => [id, k.plural])];

  return `
  <header class="topbar">
    <h1 class="h-section" style="font-size:2rem">Medicina</h1>
    <button class="icon-btn" data-action="add-cita" aria-label="Nueva cita">${icons.plus()}</button>
  </header>
  <div class="scene-banner small">${medicalScene()}</div>

  <div class="segmented" role="tablist" aria-label="Sección">
    ${Object.entries(SECTIONS).map(([id, s]) => `<button role="tab" aria-selected="${section === id}" class="${section === id ? 'on' : ''}" data-med-section="${id}">${id === 'especialista' ? `${s.label} · ${esc(specialistName())}` : s.label}</button>`).join('')}
  </div>

  ${section === 'medico'
    ? `<div class="chips scroll" role="group" aria-label="Tipo de cita" style="margin-top:12px">
        ${filters.map(([id, l]) => `<button class="chip ${filter === id ? 'on' : ''}" data-med-filter="${id}" aria-pressed="${filter === id}">${id === 'all' ? '' : kindIcon(id, 14)} ${l}</button>`).join('')}
      </div>`
    : `<div class="card specialist-card" style="margin-top:12px">
        <span class="card-badge pup terra">${pupIcon('mama', 44)}</span>
        <span><span class="eyebrow">Especialista</span><br><strong class="specialist-name">${esc(specialistName())}</strong>
        <br><span class="subtle">Citas y seguimiento con su especialista</span></span>
        <button class="link-btn" data-action="rename-specialist" style="margin-left:auto">${icons.pencil({ size: 15 })} Nombre</button>
      </div>`}

  <section class="section" aria-labelledby="next-h" style="margin-top:20px">
    <div class="section-head"><h2 class="h-section" id="next-h">Próximas citas</h2>
      ${next.length ? `<button class="link-btn" data-action="cal-all">${icons.calendar({ size: 15 })} Todas al Calendario</button>` : ''}</div>
    ${next.length
      ? `<div class="card" style="padding:4px 14px"><ul class="list">${next.map(citaRow).join('')}</ul></div>`
      : `<div class="card empty-cita">${pupIcon(section === 'medico' ? 'nube' : 'canela', 64)}<div><div class="empty-title" style="font-size:1.15rem">No hay citas próximas</div>
          <div class="empty-sub">Pulsa “Nueva cita” para apuntar ${section === 'medico' ? 'una vacuna, el pediatra, una revisión o una receta' : `la próxima cita con ${esc(specialistName())}`}.</div></div></div>`}
  </section>

  <section class="section" aria-labelledby="mcal-h">
    <div class="section-head"><h2 class="h-section" id="mcal-h">Calendario</h2></div>
    ${calendarHTML({ year: y, month: m, selected: sel, marks, mode: 'activity', id: 'mcal',
      legend: `<div class="cal-legend"><span><i class="dot b"></i>Médico</span><span><i class="dot p"></i>Especialista · ${esc(specialistName())}</span></div>` })}
    <div class="card day-detail" aria-live="polite">
      <div class="day-detail-head"><h3 class="h-section" style="font-size:1.2rem">${cap(fmtLongDate(sel))}</h3>
        <button class="link-btn" data-action="add-cita-day">${icons.plus({ size: 15 })} Cita este día</button></div>
      ${dayList.length ? `<ul class="list">${dayList.map(citaRow).join('')}</ul>` : '<p class="subtle" style="margin:4px 0">Sin citas este día.</p>'}
    </div>
  </section>

  ${old.length ? `<section class="section" aria-labelledby="hist-m">
    <div class="section-head"><h2 class="h-section" id="hist-m">Historial</h2></div>
    <div class="card" style="padding:4px 14px"><ul class="list">${old.map(citaRow).join('')}</ul></div>
    ${past(inSection).length > old.length ? '<button class="btn btn-ghost btn-block" data-action="med-more" style="margin-top:12px">Ver más</button>' : ''}
  </section>` : ''}

  <div class="note-box">${icons.bell({ size: 18 })}<span>Para que el iPhone te avise aunque la app esté cerrada, abre la cita y pulsa <strong>Añadir al Calendario del iPhone</strong>: los avisos quedan programados en tu Calendario.</span></div>

  <div class="dock"><div class="dock-inner">
    <button class="btn btn-primary" data-action="add-cita">${icons.plus({ size: 18 })} Nueva cita</button>
  </div></div>`;
}

/* ------------------------------------------------------------------ */
/* Añadir al Calendario del iPhone                                      */
/* ------------------------------------------------------------------ */

/**
 * Abre el archivo de calendario: en el iPhone se muestra el evento con el botón
 * "Añadir al calendario", y sus avisos quedan programados en el Calendario.
 */
export async function addToPhoneCalendar(citas) {
  if (!citas.length) return;
  const ics = toICS(citas, { babyName: store.settings.babyName || 'Nia' });
  const name = citas.length === 1 ? 'cita-nia.ics' : 'citas-nia.ics';
  if (typeof globalThis.claude?.use === 'function') {
    const dl = await globalThis.claude.use('downloads').catch(() => null);
    if (dl) { try { await dl.save({ filename: name, data: ics }); } catch { /* cancelado */ } }
    return;
  }
  const url = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  const a = Object.assign(document.createElement('a'), { href: url, target: '_blank', rel: 'noopener', download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast(citas.length === 1 ? 'Abriendo el Calendario…' : `Abriendo ${citas.length} citas en el Calendario…`);
}

/* ------------------------------------------------------------------ */
/* Formulario de cita                                                   */
/* ------------------------------------------------------------------ */

export function openCitaForm({ record = null, section = 'medico', kind = null, forDay = null } = {}) {
  const editing = Boolean(record);
  const st = {
    section: record?.section || section,
    kind: record?.kind || kind || (section === 'especialista' ? 'especialista' : 'pediatra'),
    reminders: record ? [...(record.reminders || [])] : [...DEFAULT_REMINDERS],
  };
  // Por defecto: mañana a las 10:00, o el día elegido en el calendario
  const base = record?.at ?? combineLocal(forDay && forDay >= dayKey() ? forDay : toDateInput(Date.now() + 86400000), '10:00');

  openSheet({
    label: editing ? 'Editar cita' : 'Nueva cita',
    render(body, close) {
      body.innerHTML = `<form novalidate autocomplete="off">
        <div class="sheet-head">
          <div class="sheet-title">${pupIcon('nube', 44)}<h2 class="h-section">${editing ? 'Editar cita' : 'Nueva cita'}</h2></div>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icons.close()}</button>
        </div>

        <div class="segmented" role="radiogroup" aria-label="Sección">
          ${Object.entries(SECTIONS).map(([id, s]) => `<button type="button" role="radio" data-sec="${id}">${id === 'especialista' ? `${s.label} · ${esc(specialistName())}` : s.label}</button>`).join('')}
        </div>

        <div class="field kinds-field"><div class="field-label"><span class="eyebrow">Tipo de cita</span></div>
          <div class="kinds" role="radiogroup" aria-label="Tipo de cita">
            ${Object.entries(KINDS).filter(([, k]) => k.section === 'medico').map(([id, k]) => `<button type="button" role="radio" class="kind-opt" data-kind="${id}">${kindIcon(id, 22)}<span>${k.label}</span></button>`).join('')}
          </div></div>

        <div class="field"><div class="field-label"><span class="eyebrow">Título</span><span class="field-hint">Opcional</span></div>
          <label class="input-shell"><span class="sr-only">Título</span><input name="title" maxlength="80" value="${esc(record?.title || '')}"></label></div>

        <div class="field"><div class="field-label"><span class="eyebrow">Cuándo</span></div>
          <div class="when">
            <label class="input-shell">${icons.calendar({ size: 18 })}<span class="sr-only">Fecha</span><input type="date" name="date" value="${toDateInput(base)}" required></label>
            <label class="input-shell">${icons.clock({ size: 18 })}<span class="sr-only">Hora</span><input type="time" name="time" value="${toTimeInput(base)}" required></label>
          </div></div>

        <div class="field"><div class="field-label"><span class="eyebrow">Profesional</span><span class="field-hint">Opcional</span></div>
          <label class="input-shell">${icons.stetho({ size: 18 })}<span class="sr-only">Profesional</span><input name="doctor" maxlength="80" placeholder="Ej. Dra. López" value="${esc(record?.doctor || '')}"></label></div>

        <div class="field"><div class="field-label"><span class="eyebrow">Lugar</span><span class="field-hint">Opcional</span></div>
          <label class="input-shell">${icons.home({ size: 18 })}<span class="sr-only">Lugar</span><input name="place" maxlength="120" placeholder="Ej. Centro de Salud · consulta 4" value="${esc(record?.place || '')}"></label></div>

        <div class="field"><div class="field-label"><span class="eyebrow">Avisos</span><span class="field-hint">Puedes elegir varios</span></div>
          <div class="chips" role="group" aria-label="Avisos">
            ${REMINDERS.map(([v, l]) => `<button type="button" class="chip" data-rem="${v}" aria-pressed="false">${icons.bell({ size: 14 })} ${l}</button>`).join('')}
          </div></div>

        <div class="field"><div class="field-label"><span class="eyebrow">Notas</span><span class="field-hint">Opcional</span></div>
          <textarea class="notes" name="notes" rows="3" maxlength="500" placeholder="Llevar la cartilla de vacunas, preguntar por…">${esc(record?.notes || '')}</textarea></div>

        <p class="form-error" role="alert"></p>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-block">${icons.check({ size: 18 })} ${editing ? 'Guardar cambios' : 'Guardar cita'}</button>
          ${editing ? `
            <button type="button" class="btn btn-blue btn-block" data-ics>${icons.calendar({ size: 18 })} Añadir al Calendario del iPhone</button>
            <button type="button" class="btn btn-ghost btn-block" data-done>${record.done ? 'Marcar como pendiente' : '✓ Marcar como hecha'}</button>
            <button type="button" class="btn btn-danger btn-block" data-delete>${icons.trash({ size: 18 })} Eliminar cita</button>` : ''}
        </div>
      </form>`;

      const form = $('form', body);
      const err = $('.form-error', form);
      const sync = () => {
        $$('[data-sec]', form).forEach((b) => { const on = b.dataset.sec === st.section; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
        $('.kinds-field', form).hidden = st.section !== 'medico';
        $$('[data-kind]', form).forEach((b) => { const on = b.dataset.kind === st.kind; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
        $$('[data-rem]', form).forEach((b) => { const on = st.reminders.includes(Number(b.dataset.rem)); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
        form.title.placeholder = KINDS[st.kind]?.hint || '';
        err.textContent = '';
      };
      form.addEventListener('click', async (e) => {
        const sec = e.target.closest('[data-sec]');
        if (sec) {
          st.section = sec.dataset.sec;
          st.kind = st.section === 'especialista' ? 'especialista' : (st.kind === 'especialista' ? 'pediatra' : st.kind);
          if (st.section === 'especialista' && !form.doctor.value.trim()) form.doctor.value = specialistName();
          if (st.section === 'medico' && form.doctor.value.trim() === specialistName()) form.doctor.value = '';
          sync();
        }
        const k = e.target.closest('[data-kind]');
        if (k) { st.kind = k.dataset.kind; sync(); }
        const r = e.target.closest('[data-rem]');
        if (r) {
          const v = Number(r.dataset.rem);
          st.reminders = st.reminders.includes(v) ? st.reminders.filter((x) => x !== v) : [...st.reminders, v];
          sync();
        }
        if (e.target.closest('[data-ics]')) addToPhoneCalendar([store.get('citas', record.id) || record]);
        if (e.target.closest('[data-done]')) {
          await store.save('citas', { id: record.id, done: !record.done });
          close();
          toast(record.done ? 'Cita pendiente' : 'Cita marcada como hecha');
        }
        if (e.target.closest('[data-delete]')) {
          const ok = await confirmDialog({ title: '¿Eliminar esta cita?', message: 'Se borrará de la app en todos los dispositivos. Si la añadiste al Calendario del iPhone, bórrala también allí.', confirmLabel: 'Eliminar cita' });
          if (!ok) return;
          await store.remove('citas', record.id);
          close();
          toast('Cita eliminada');
        }
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          at: form.date.value && form.time.value ? combineLocal(form.date.value, form.time.value) : NaN,
          section: st.section,
          kind: st.kind,
          title: form.title.value.trim(),
          doctor: form.doctor.value.trim(),
          place: form.place.value.trim(),
          notes: form.notes.value.trim(),
          reminders: [...st.reminders].sort((a, b) => b - a),
          done: record?.done || false,
        };
        const msg = validateCita(data);
        if (msg) { err.textContent = msg; return; }
        const saved = await store.save('citas', editing ? { ...data, id: record.id } : data);
        close();
        toast(editing ? 'Cita actualizada' : 'Cita guardada');
        if (!editing && data.reminders.length && data.at > Date.now()) {
          const ok = await confirmDialog({
            title: '¿Quieres que el iPhone te avise?',
            message: `Añade la cita a tu Calendario y te avisará ${data.reminders.map((m) => reminderLabel(m).toLowerCase()).join(' y ')}, aunque la app esté cerrada.`,
            confirmLabel: 'Añadir al Calendario', cancelLabel: 'Ahora no', danger: false,
          });
          if (ok) addToPhoneCalendar([saved]);
        }
      });
      if (st.section === 'especialista' && !form.doctor.value) form.doctor.value = specialistName();
      sync();
    },
  });
}

/** Cambiar el nombre de la especialista (por defecto, Angela). */
export function openSpecialistName() {
  openSheet({
    label: 'Especialista',
    render(body, close) {
      body.innerHTML = `<form novalidate><div class="sheet-head"><h2 class="h-section">Especialista</h2>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icons.close()}</button></div>
        <label class="auth-field"><span class="eyebrow">Nombre de la especialista</span>
          <input class="auth-input" name="name" maxlength="40" value="${esc(specialistName())}"></label>
        <div class="form-actions" style="margin-top:16px"><button type="submit" class="btn btn-primary btn-block">Guardar</button></div></form>`;
      $('form', body).onsubmit = async (e) => {
        e.preventDefault();
        await store.updateSettings({ specialistName: e.target.name.value.trim() || DEFAULT_SPECIALIST });
        close();
        toast('Nombre guardado');
      };
    },
  });
}

/** Tarjeta de la próxima cita para la pantalla Hoy (o vacío si no hay en 30 días). */
export function nextCitaCard() {
  const next = upcoming(store.all('citas'))[0];
  if (!next || next.at - Date.now() > 30 * 86400000) return '';
  const key = dayKey(next.at);
  return `<button class="card next-cita" data-cita="${next.id}" aria-label="Próxima cita: ${esc(citaTitle(next))}, ${relativeDayLabel(key)} a las ${fmtTime(next.at)}">
    <span class="card-badge ${next.section === 'especialista' ? 'terra' : ''}">${kindIcon(next.kind, 20)}</span>
    <span class="next-cita-main"><span class="eyebrow">Próxima cita</span>
      <span class="next-cita-title">${esc(citaTitle(next))}</span>
      <span class="subtle">${relativeDayLabel(key)} · ${fmtTime(next.at)}${next.place ? ` · ${esc(next.place)}` : ''}</span></span>
    <span class="row-chev">${icons.right({ size: 18 })}</span>
  </button>`;
}

