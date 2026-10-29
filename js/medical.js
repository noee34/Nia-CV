// MEDICINA: tipos de cita, avisos y archivo de calendario (.ics) para el iPhone.
// Lógica pura (sin pantalla), probada en tests/medical.test.mjs.

export const SECTIONS = {
  medico: { label: 'Médico' },
  especialista: { label: 'Especialista' },
};

/** Tipos de cita. Los cuatro primeros son de la sección Médico. */
export const KINDS = {
  vacuna: { label: 'Vacuna', plural: 'Vacunas', section: 'medico', hint: 'Ej. Hexavalente · 2.ª dosis' },
  pediatra: { label: 'Pediatra', plural: 'Pediatra', section: 'medico', hint: 'Ej. Consulta por catarro' },
  revision: { label: 'Revisión', plural: 'Revisiones', section: 'medico', hint: 'Ej. Revisión de los 4 meses' },
  receta: { label: 'Receta', plural: 'Recetas', section: 'medico', hint: 'Ej. Vitamina D · renovar' },
  especialista: { label: 'Especialista', plural: 'Especialista', section: 'especialista', hint: 'Ej. Seguimiento' },
};

export const DEFAULT_SPECIALIST = 'Angela';

/** Avisos disponibles, en minutos antes de la cita. */
export const REMINDERS = [
  [10080, '1 semana antes'],
  [1440, '1 día antes'],
  [120, '2 horas antes'],
  [60, '1 hora antes'],
  [30, '30 min antes'],
  [0, 'A la hora'],
];
export const DEFAULT_REMINDERS = [1440, 60];
export const reminderLabel = (m) => (REMINDERS.find(([v]) => v === m) || [m, `${m} min antes`])[1];

export const byAt = (a, b) => a.at - b.at;

/** Próximas citas (no hechas y aún por llegar, con 1 h de margen tras la hora). */
export function upcoming(list, now = Date.now()) {
  return list.filter((c) => !c.done && c.at >= now - 3600000).sort(byAt);
}

/** Citas pasadas o hechas, de la más reciente a la más antigua. */
export function past(list, now = Date.now()) {
  return list.filter((c) => c.done || c.at < now - 3600000).sort((a, b) => b.at - a.at);
}

/**
 * Avisos que "suenan" entre `from` (excluido) y `to` (incluido), para los
 * recordatorios dentro de la app. Devuelve [{ cita, minutes, at }].
 */
export function dueReminders(list, from, to) {
  const out = [];
  for (const c of list) {
    if (c.done) continue;
    for (const m of c.reminders || []) {
      const at = c.at - m * 60000;
      if (at > from && at <= to) out.push({ cita: c, minutes: m, at });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Título legible de una cita: "Vacuna · Hexavalente". */
export function citaTitle(c) {
  const kind = KINDS[c.kind]?.label || 'Cita';
  if (c.kind === 'especialista') return `${c.doctor || DEFAULT_SPECIALIST}${c.title ? ` · ${c.title}` : ''}`;
  return c.title ? `${kind} · ${c.title}` : kind;
}

export function validateCita(c) {
  if (!Number.isFinite(c.at)) return 'Indica la fecha y la hora.';
  if (!SECTIONS[c.section]) return 'Elige Médico o Especialista.';
  if (!KINDS[c.kind] || KINDS[c.kind].section !== c.section) return 'Elige el tipo de cita.';
  if ((c.title || '').length > 80) return 'El título es demasiado largo (máximo 80 caracteres).';
  return null;
}

/* ------------------------------------------------------------------ */
/* Calendario del iPhone (.ics, estándar iCalendar)                     */
/* ------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, '0');
/** Fecha en UTC con formato iCalendar: 20261103T093000Z */
export function icsDate(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
/** Escapa texto según iCalendar (barras, comas, punto y coma, saltos de línea). */
export function icsText(s) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
/** Corta líneas largas (máx. 75 bytes) como pide el estándar. */
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = '';
  let curLen = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
    if (curLen + len > (out.length ? 74 : 75)) { out.push(cur); cur = ''; curLen = 0; }
    cur += ch; curLen += len;
  }
  out.push(cur);
  return out.join('\r\n ');
}
const triggerOf = (m) => (m === 0 ? 'PT0M' : m % 1440 === 0 ? `P${m / 1440}D` : m % 60 === 0 ? `PT${m / 60}H` : `PT${m}M`);

/** Archivo .ics con una o varias citas y sus avisos (alarmas del iPhone). */
export function toICS(citas, { babyName = 'Nia', now = Date.now(), durationMin = 30 } = {}) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nia CV//Medicina//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const c of citas) {
    const title = `${citaTitle(c)} (${babyName})`;
    const desc = [
      KINDS[c.kind] ? `${SECTIONS[c.section]?.label || ''} · ${KINDS[c.kind].label}` : '',
      c.doctor ? `Profesional: ${c.doctor}` : '',
      c.notes || '',
      'Creado con Nia CV',
    ].filter(Boolean).join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${c.id}@nia-cv`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(c.at)}`,
      `DTEND:${icsDate(c.at + durationMin * 60000)}`,
      `SUMMARY:${icsText(title)}`,
      ...(c.place ? [`LOCATION:${icsText(c.place)}`] : []),
      `DESCRIPTION:${icsText(desc)}`,
    );
    for (const m of [...new Set(c.reminders || [])].sort((a, b) => b - a)) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(`${title} · ${reminderLabel(m)}`)}`, `TRIGGER:-${triggerOf(m)}`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
