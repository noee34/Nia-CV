// MEDICACIÓN: medicamentos y vitaminas con horas de toma, estado de cada toma,
// mensaje de WhatsApp y alarmas diarias para el Calendario del iPhone.
// Lógica pura (sin pantalla), probada en tests/meds.test.mjs.
import { dayKey, combineLocal, addDays } from './dates.js';

export const MED_TYPES = {
  medicamento: { label: 'Medicamento' },
  vitamina: { label: 'Vitamina' },
};

/** Margen para considerar que una toma "toca ahora" (antes y después de su hora). */
export const DUE_WINDOW_MIN = 60;

export const DEFAULT_WHATSAPP_TEMPLATE =
  '⏰ Recordatorio: toca darle a {bebe} {medicamento} ({dosis}) a las {hora}.';

/** Huecos que se pueden usar en el mensaje de WhatsApp. */
export const TEMPLATE_FIELDS = [
  ['{bebe}', 'nombre del bebé'],
  ['{medicamento}', 'nombre del medicamento o vitamina'],
  ['{dosis}', 'dosis'],
  ['{hora}', 'hora de la toma'],
  ['{tipo}', '“medicamento” o “vitamina”'],
];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateMed(m) {
  if (!m.name || !m.name.trim()) return 'Escribe el nombre del medicamento o vitamina.';
  if (m.name.length > 60) return 'El nombre es demasiado largo (máximo 60 caracteres).';
  if (!MED_TYPES[m.type]) return 'Elige si es medicamento o vitamina.';
  if (!Array.isArray(m.times) || !m.times.length) return 'Añade al menos una hora de toma.';
  if (!m.times.every((t) => HHMM.test(t))) return 'Alguna hora no es válida.';
  if (!m.startDate) return 'Indica desde qué día.';
  if (m.endDate && m.endDate < m.startDate) return 'La fecha de fin no puede ser anterior a la de inicio.';
  return null;
}

/** ¿Se da este medicamento el día indicado? */
export function activeOn(med, key) {
  if (!med || med.paused) return false;
  if (med.startDate && key < med.startDate) return false;
  if (med.endDate && key > med.endDate) return false;
  return true;
}

/** Clave única de una toma: medicamento + día + hora. */
export const doseKey = (medId, key, time) => `${medId}|${key}|${time}`;

/**
 * Tomas de un día, ordenadas por hora:
 * [{ med, time, at, key, log }] — `log` es el registro de "dada" si existe.
 */
export function dosesForDay(meds, logs, key) {
  const given = new Map(logs.map((l) => [l.dose, l]));
  const out = [];
  for (const med of meds) {
    if (!activeOn(med, key)) continue;
    for (const time of [...new Set(med.times)].sort()) {
      const k = doseKey(med.id, key, time);
      out.push({ med, time, at: combineLocal(key, time), key: k, log: given.get(k) || null });
    }
  }
  return out.sort((a, b) => a.at - b.at || a.med.name.localeCompare(b.med.name));
}

/** Estado de una toma: 'dada' | 'ahora' | 'retrasada' | 'pendiente'. */
export function doseStatus(dose, now = Date.now()) {
  if (dose.log) return 'dada';
  const diff = (now - dose.at) / 60000;
  if (diff >= -DUE_WINDOW_MIN && diff <= DUE_WINDOW_MIN) return 'ahora';
  if (diff > DUE_WINDOW_MIN) return 'retrasada';
  return 'pendiente';
}

/** Tomas sin dar cuya hora llega entre `from` (excluido) y `to` (incluido), para el aviso. */
export function dueDoses(meds, logs, from, to) {
  const out = [];
  for (let key = dayKey(from); key <= dayKey(to); key = addDays(key, 1)) {
    for (const d of dosesForDay(meds, logs, key)) {
      if (!d.log && d.at > from && d.at <= to) out.push(d);
    }
  }
  return out;
}

/** Rellena el mensaje de WhatsApp con los datos de la toma. */
export function fillTemplate(template, { baby = 'Nia', med, time }) {
  const values = {
    '{bebe}': baby,
    '{medicamento}': med?.name || '',
    '{dosis}': med?.dose || 'según indicación',
    '{hora}': time || '',
    '{tipo}': MED_TYPES[med?.type]?.label.toLowerCase() || '',
  };
  return (template || DEFAULT_WHATSAPP_TEMPLATE).replace(/\{(bebe|medicamento|dosis|hora|tipo)\}/g, (m) => values[m]);
}

/** Enlace de WhatsApp: al chat de ese teléfono si se indica; si no, eligiendo contacto. */
export function whatsappLink(text, phone = '') {
  const digits = String(phone || '').replace(/[^\d]/g, '').replace(/^00/, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/* ------------------------------------------------------------------ */
/* Calendario del iPhone: alarma diaria a cada hora de toma             */
/* ------------------------------------------------------------------ */

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const compact = (key) => key.replace(/-/g, '');

function fold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out = [];
  let cur = '', len = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (len + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; len = 0; }
    cur += ch; len += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/**
 * Un evento que se repite cada día por cada hora de toma, con aviso a la hora.
 * Hora "flotante" (sin zona): siempre a la misma hora local, también tras el
 * cambio de hora de verano/invierno.
 */
export function medsICS(meds, { babyName = 'Nia', now = Date.now() } = {}) {
  const stamp = new Date(now).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nia CV//Medicacion//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const med of meds) {
    for (const time of [...new Set(med.times)].sort()) {
      const hhmm = time.replace(':', '');
      const title = `${med.name}${med.dose ? ` · ${med.dose}` : ''} (${babyName})`;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${med.id}-${hhmm}@nia-cv`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${compact(med.startDate)}T${hhmm}00`,
        'DURATION:PT10M',
        `RRULE:FREQ=DAILY${med.endDate ? `;UNTIL=${compact(med.endDate)}T235959` : ''}`,
        `SUMMARY:${esc(`💊 ${title}`)}`,
        `DESCRIPTION:${esc(`${MED_TYPES[med.type]?.label || ''} · ${med.dose || ''}${med.notes ? `\n${med.notes}` : ''}\nCreado con Nia CV`)}`,
        'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`Toca dar ${title}`)}`, 'TRIGGER:-PT0M', 'END:VALARM',
        'END:VEVENT',
      );
    }
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
