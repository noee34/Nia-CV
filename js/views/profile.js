// Pestaña NIA: foto, datos personales (nacimiento, edad, grupo sanguíneo, talla)
// y álbum mes a mes del primer año (nacimiento + meses 1 a 12).
import { store } from '../store.js';
import { icons } from '../art.js';
import { balloonScene, photoFrame, pupIcon } from '../characters.js';
import { openSheet, confirmDialog, toast, esc, $ } from '../ui.js';
import { dayKey, addMonths, monthsBetween, ageText, fmtLongDate, fmtShortDate, cap } from '../dates.js';
import { photoFromFile } from '../photo.js';

export const BLOOD_TYPES = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', '0+', '0−'];
const MONTHS = Array.from({ length: 13 }, (_, i) => i); // 0 = nacimiento … 12 = primer año

export const monthLabel = (n) => (n === 0 ? 'Nacimiento' : n === 12 ? '12 meses · ¡1 año!' : `${n} ${n === 1 ? 'mes' : 'meses'}`);

/** Entrada del álbum de un mes (si hubiera dos por sincronizar a la vez, la más reciente). */
export function albumEntry(n) {
  return store.all('album').filter((r) => r.month === n).sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
}

const fmtHeight = (cm) => `${String(cm).replace('.', ',')} cm`;

export function renderProfile() {
  const s = store.settings;
  const name = s.babyName || 'Nia';
  const birth = s.birthDate || '';
  const today = dayKey();
  const done = MONTHS.filter((n) => albumEntry(n)?.photo).length;
  const current = birth ? Math.min(12, monthsBetween(birth, today)) : -1;

  const row = (icon, label, value, empty = 'Sin indicar') => `<div class="data-row">
      <span class="ico">${icon}</span><span class="data-label">${label}</span>
      <span class="data-value ${value ? '' : 'soft'}">${value ? esc(value) : empty}</span></div>`;

  const tiles = MONTHS.map((n) => {
    const e = albumEntry(n);
    const date = birth ? addMonths(birth, n) : '';
    const future = date && date > today;
    const cls = ['album-tile', e?.photo ? 'has-photo' : '', n === current ? 'now' : '', future ? 'future' : ''].filter(Boolean).join(' ');
    const sub = date ? (future ? `Llega el ${fmtShortDate(date)}` : fmtShortDate(date)) : '';
    return `<button class="${cls}" data-album="${n}" aria-label="${monthLabel(n)}${e?.photo ? ', con foto' : ', sin foto'}${sub ? `, ${sub}` : ''}">
      <span class="album-pic">${e?.photo
        ? `<img src="${e.photo}" alt="" loading="lazy">`
        : `<span class="album-empty"><span class="album-num">${n === 0 ? '★' : n}</span>${pupIcon(n % 2 ? 'canela' : 'nube', 40)}</span>`}</span>
      <span class="album-label">${monthLabel(n)}</span>
      <span class="album-sub">${n === current ? 'Este mes' : sub || (e?.notes ? '✎ Con nota' : '&nbsp;')}</span>
    </button>`;
  }).join('');

  return `
  <header class="topbar">
    <h1 class="h-section" style="font-size:2rem">${esc(name)}</h1>
    <button class="icon-btn" data-action="edit-profile" aria-label="Editar datos de ${esc(name)}">${icons.pencil()}</button>
  </header>

  ${s.photo ? photoFrame(s.photo, `Foto de ${esc(name)}`) : `<div class="scene-banner small">${balloonScene()}</div>`}
  <div class="photo-actions center">
    <label class="btn btn-ghost btn-sm">${icons.upload({ size: 16 })} ${s.photo ? 'Cambiar foto' : 'Elegir foto'}
      <input type="file" accept="image/*" name="header-photo" class="sr-only"></label>
    ${s.photo ? `<button type="button" class="btn btn-danger btn-sm" data-action="remove-photo">${icons.trash({ size: 16 })} Quitar foto</button>` : ''}
  </div>

  <section class="card" aria-labelledby="pd-h" style="margin-top:8px">
    <div class="card-head"><span class="eyebrow" id="pd-h">Datos personales</span>
      <button class="link-btn" data-action="edit-profile" style="min-height:32px">${icons.pencil({ size: 15 })} Editar</button></div>
    <div class="data-list">
      ${row(icons.heart({ size: 17 }), 'Nombre', name)}
      ${row(icons.calendar({ size: 17 }), 'Nacimiento', birth ? cap(fmtLongDate(birth, { year: true })) : '')}
      ${row(icons.star({ size: 17 }), 'Edad', birth ? ageText(birth, today) : '', 'Añade la fecha de nacimiento')}
      ${row(icons.shield({ size: 17 }), 'Grupo sanguíneo', s.bloodType || '')}
      ${row(icons.chart({ size: 17 }), 'Talla', s.heightCm ? fmtHeight(s.heightCm) + (s.heightDate ? ` · ${fmtShortDate(s.heightDate)}` : '') : '')}
    </div>
  </section>

  <section class="section" aria-labelledby="al-h">
    <div class="section-head"><h2 class="h-section" id="al-h">Álbum del primer año</h2><span class="subtle">${done} de 13 fotos</span></div>
    <p class="subtle" style="margin:-4px 0 14px">${birth ? 'Una foto por cada mes cumplido, desde el día que nació hasta su primer cumpleaños.' : 'Añade la fecha de nacimiento en Datos personales para ver la fecha de cada mes.'}</p>
    <div class="album-grid">${tiles}</div>
  </section>

  <div class="note-box" style="margin-top:22px">${icons.shield({ size: 18 })}<span>Los datos personales y las fotos se guardan en tu cuenta y solo los ve quien entra con ella.</span></div>`;
}

/* ------------------------------------------------------------------ */
/* Editar datos personales                                             */
/* ------------------------------------------------------------------ */

export function openProfileForm() {
  const s = store.settings;
  openSheet({
    label: 'Datos personales',
    render(body, close) {
      body.innerHTML = `<form novalidate autocomplete="off">
        <div class="sheet-head">
          <div class="sheet-title">${pupIcon('canela', 44)}<h2 class="h-section">Datos personales</h2></div>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icons.close()}</button>
        </div>
        <div class="field"><div class="field-label"><span class="eyebrow">Nombre</span></div>
          <label class="input-shell"><span class="sr-only">Nombre</span><input name="name" value="${esc(s.babyName || 'Nia')}" maxlength="24" autocapitalize="words"></label></div>
        <div class="field"><div class="field-label"><span class="eyebrow">Fecha de nacimiento</span><span class="field-hint">La edad se calcula sola</span></div>
          <label class="input-shell">${icons.calendar({ size: 18 })}<span class="sr-only">Fecha de nacimiento</span><input type="date" name="birth" value="${s.birthDate || ''}" max="${dayKey()}"></label></div>
        <div class="field"><div class="field-label"><span class="eyebrow">Grupo sanguíneo</span></div>
          <div class="blood" role="radiogroup" aria-label="Grupo sanguíneo">
            ${[...BLOOD_TYPES, ''].map((b) => `<button type="button" role="radio" aria-checked="${(s.bloodType || '') === b}" class="chip ${(s.bloodType || '') === b ? 'on' : ''}" data-blood="${b}">${b || 'No lo sé'}</button>`).join('')}
          </div></div>
        <div class="field"><div class="field-label"><span class="eyebrow">Talla</span><span class="field-hint">En centímetros</span></div>
          <div class="when">
            <label class="input-shell"><span class="sr-only">Talla en centímetros</span><input type="text" name="height" inputmode="decimal" autocomplete="off" placeholder="Ej. 58,5" value="${s.heightCm != null ? String(s.heightCm).replace('.', ',') : ''}"><span class="unit">cm</span></label>
            <label class="input-shell">${icons.calendar({ size: 18 })}<span class="sr-only">Fecha de la medición</span><input type="date" name="heightDate" value="${s.heightDate || dayKey()}" max="${dayKey()}"></label>
          </div></div>
        <p class="form-error" role="alert"></p>
        <div class="form-actions"><button type="submit" class="btn btn-primary btn-block">${icons.check({ size: 18 })} Guardar datos</button></div>
        <p class="subtle" style="text-align:center;margin-top:10px">Solo tú (y quien use tu cuenta) puede ver estos datos.</p>
      </form>`;
      const form = $('form', body);
      let blood = s.bloodType || '';
      form.addEventListener('click', (e) => {
        const b = e.target.closest('[data-blood]');
        if (!b) return;
        blood = b.dataset.blood;
        form.querySelectorAll('[data-blood]').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = $('.form-error', form);
        const birth = form.birth.value;
        const hRaw = form.height.value.trim().replace(',', '.');
        const height = hRaw === '' ? null : Math.round(Number(hRaw) * 10) / 10;
        if (birth && birth > dayKey()) { err.textContent = 'La fecha de nacimiento no puede ser futura.'; return; }
        if (height !== null && (!Number.isFinite(height) || height < 30 || height > 130)) { err.textContent = 'Escribe una talla entre 30 y 130 cm.'; return; }
        await store.updateSettings({
          babyName: form.name.value.trim() || 'Nia',
          birthDate: birth || null,
          bloodType: blood || null,
          heightCm: height,
          heightDate: height !== null ? (form.heightDate.value || dayKey()) : null,
        });
        close();
        toast('Datos guardados');
      });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Foto de cabecera                                                     */
/* ------------------------------------------------------------------ */

export async function setHeaderPhoto(file) {
  try {
    const photo = await photoFromFile(file);
    await store.updateSettings({ photo });
    toast('Foto guardada');
  } catch (err) { toast(err.message || 'No se pudo guardar la foto'); }
}

export async function removeHeaderPhoto() {
  const ok = await confirmDialog({ title: '¿Quitar la foto?', message: 'Volverá a aparecer el dibujo en su lugar.', confirmLabel: 'Quitar foto' });
  if (!ok) return;
  await store.updateSettings({ photo: null });
  toast('Foto quitada');
}

/* ------------------------------------------------------------------ */
/* Álbum: un mes                                                        */
/* ------------------------------------------------------------------ */

export function openAlbumMonth(n) {
  const existing = albumEntry(n);
  const birth = store.settings.birthDate;
  const date = birth ? addMonths(birth, n) : '';
  let photo = existing?.photo || '';

  openSheet({
    label: monthLabel(n),
    render(body, close) {
      const draw = () => {
        body.innerHTML = `<form novalidate>
          <div class="sheet-head">
            <div class="sheet-title">${pupIcon(n % 2 ? 'canela' : 'nube', 44)}<div><h2 class="h-section">${monthLabel(n)}</h2>
              ${date ? `<div class="subtle">${cap(fmtLongDate(date, { year: true }))}</div>` : ''}</div></div>
            <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icons.close()}</button>
          </div>
          <div class="album-preview">${photo ? `<img src="${photo}" alt="Foto de ${monthLabel(n)}">` : `<div class="album-preview-empty">${pupIcon(n % 2 ? 'canela' : 'nube', 96)}<span>Todavía no hay foto de este mes</span></div>`}</div>
          <div class="photo-actions center" style="padding:12px 0 0">
            <label class="btn btn-ghost btn-sm">${icons.upload({ size: 16 })} ${photo ? 'Cambiar foto' : 'Elegir foto'}
              <input type="file" accept="image/*" name="albumPhoto" class="sr-only"></label>
            ${photo ? `<button type="button" class="btn btn-danger btn-sm" data-clear-photo>${icons.trash({ size: 16 })} Quitar foto</button>` : ''}
          </div>
          <div class="field"><div class="field-label"><span class="eyebrow">Nota del mes</span><span class="field-hint">Opcional</span></div>
            <textarea class="notes" name="notes" rows="3" maxlength="500" placeholder="Primera sonrisa, nuevo diente, primeras palabras…">${esc(existing?.notes || '')}</textarea></div>
          <p class="form-error" role="alert"></p>
          <div class="form-actions"><button type="submit" class="btn btn-primary btn-block">${icons.check({ size: 18 })} Guardar en el álbum</button></div>
        </form>`;
      };
      draw();
      let notesDraft = existing?.notes || '';
      body.addEventListener('input', (e) => { if (e.target.name === 'notes') notesDraft = e.target.value; });
      body.addEventListener('change', async (e) => {
        if (e.target.name !== 'albumPhoto' || !e.target.files?.[0]) return;
        try { photo = await photoFromFile(e.target.files[0]); draw(); $('textarea', body).value = notesDraft; }
        catch (err) { $('.form-error', body).textContent = err.message; }
      });
      body.addEventListener('click', async (e) => {
        if (!e.target.closest('[data-clear-photo]')) return;
        photo = ''; draw(); $('textarea', body).value = notesDraft;
      });
      body.addEventListener('submit', async (e) => {
        e.preventDefault();
        const notes = notesDraft.trim();
        if (!photo && !notes) {
          if (existing) {
            const ok = await confirmDialog({ title: `¿Vaciar “${monthLabel(n)}”?`, message: 'Se quitarán la foto y la nota de este mes.', confirmLabel: 'Vaciar' });
            if (!ok) return;
            await store.remove('album', existing.id);
            close();
            return toast('Mes vaciado');
          }
          $('.form-error', body).textContent = 'Elige una foto o escribe una nota.';
          return;
        }
        await store.save('album', { ...(existing ? { id: existing.id } : {}), month: n, photo, notes, at: existing?.at || Date.now() });
        close();
        toast(`Guardado en “${monthLabel(n)}”`);
      });
    },
  });
}

