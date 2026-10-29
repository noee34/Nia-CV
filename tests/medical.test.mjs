// Medicina: próximas citas, avisos y archivo de calendario (.ics).
import test from 'node:test';
import assert from 'node:assert/strict';
import { upcoming, past, dueReminders, toICS, icsDate, icsText, citaTitle, validateCita } from '../js/medical.js';

const H = 3600000;
const now = new Date(2026, 9, 29, 12, 0).getTime();
const cita = (over = {}) => ({ id: 'c1', at: now + 24 * H, section: 'medico', kind: 'vacuna', title: 'Hexavalente', reminders: [1440, 60], done: false, ...over });

test('próximas y pasadas', () => {
  const list = [cita({ id: 'a', at: now + 2 * H }), cita({ id: 'b', at: now - 3 * H }), cita({ id: 'c', at: now + 48 * H, done: true }), cita({ id: 'd', at: now - 30 * 60000 })];
  assert.deepEqual(upcoming(list, now).map((c) => c.id), ['d', 'a'], 'una cita de hace 30 min sigue en próximas');
  assert.deepEqual(past(list, now).map((c) => c.id), ['c', 'b']);
});

test('avisos que tocan en un intervalo', () => {
  const c = cita({ at: now + 24 * H });           // mañana a las 12:00
  assert.deepEqual(dueReminders([c], now - 60000, now).map((r) => r.minutes), [1440], 'el de 1 día antes suena ahora');
  assert.deepEqual(dueReminders([c], now, now + 23 * H - 60000), [], 'nada entre medias');
  assert.deepEqual(dueReminders([c], now + 22 * H, now + 23 * H).map((r) => r.minutes), [60]);
  assert.deepEqual(dueReminders([{ ...c, done: true }], now - 60000, now), [], 'las hechas no avisan');
});

test('títulos y validación', () => {
  assert.equal(citaTitle(cita()), 'Vacuna · Hexavalente');
  assert.equal(citaTitle(cita({ kind: 'revision', title: '' })), 'Revisión');
  assert.equal(citaTitle(cita({ section: 'especialista', kind: 'especialista', doctor: 'Angela', title: 'Seguimiento' })), 'Angela · Seguimiento');
  assert.equal(validateCita(cita()), null);
  assert.match(validateCita(cita({ kind: 'especialista' })), /tipo/);
  assert.match(validateCita(cita({ at: NaN })), /fecha/);
});

test('archivo .ics para el Calendario del iPhone', () => {
  const at = Date.UTC(2026, 10, 3, 9, 30); // 3 nov 2026, 09:30 UTC
  const ics = toICS([cita({ at, place: 'Centro de Salud, Planta 2', notes: 'Llevar cartilla; y el chupete', reminders: [10080, 1440, 60, 30, 0] })], { now: Date.UTC(2026, 9, 29, 12) });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(ics.includes('DTSTART:20261103T093000Z'));
  assert.ok(ics.includes('DTEND:20261103T100000Z'));
  assert.ok(ics.includes('SUMMARY:Vacuna · Hexavalente (Nia)'));
  assert.ok(ics.includes('LOCATION:Centro de Salud\\, Planta 2'));
  assert.ok(ics.replace(/\r\n /g, '').includes('Llevar cartilla\\; y el chupete'));
  for (const t of ['TRIGGER:-P7D', 'TRIGGER:-P1D', 'TRIGGER:-PT1H', 'TRIGGER:-PT30M', 'TRIGGER:-PT0M']) assert.ok(ics.includes(t), t);
  assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 5);
  assert.ok(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75), 'líneas de 75 bytes como máximo');
  assert.equal(icsDate(Date.UTC(2027, 0, 1, 0, 0, 5)), '20270101T000005Z');
  assert.equal(icsText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
});
