// Medicación: tomas del día, estados, avisos, mensaje de WhatsApp y alarmas diarias.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMed, activeOn, dosesForDay, doseStatus, dueDoses, fillTemplate, whatsappLink, medsICS, doseKey,
} from '../js/meds.js';

const vitD = { id: 'v', name: 'Vitamina D', type: 'vitamina', dose: '5 gotas', times: ['09:00'], startDate: '2026-11-01', endDate: null, paused: false };
const anti = { id: 'a', name: 'Amoxicilina', type: 'medicamento', dose: '2,5 ml', times: ['21:00', '09:00'], startDate: '2026-11-20', endDate: '2026-11-26', paused: false };
const at = (key, hm) => { const [y, m, d] = key.split('-').map(Number); const [h, mi] = hm.split(':').map(Number); return new Date(y, m - 1, d, h, mi).getTime(); };

test('validación', () => {
  assert.equal(validateMed(vitD), null);
  assert.match(validateMed({ ...vitD, name: ' ' }), /nombre/);
  assert.match(validateMed({ ...vitD, times: [] }), /hora/);
  assert.match(validateMed({ ...vitD, times: ['25:00'] }), /no es válida/);
  assert.match(validateMed({ ...anti, endDate: '2026-11-10' }), /anterior/);
});

test('días en que se da', () => {
  assert.equal(activeOn(anti, '2026-11-19'), false);
  assert.equal(activeOn(anti, '2026-11-20'), true);
  assert.equal(activeOn(anti, '2026-11-26'), true);
  assert.equal(activeOn(anti, '2026-11-27'), false);
  assert.equal(activeOn({ ...vitD, paused: true }, '2026-11-22'), false);
});

test('tomas del día ordenadas y marcadas como dadas', () => {
  const logs = [{ id: 'l1', medId: 'a', dose: doseKey('a', '2026-11-22', '09:00'), at: at('2026-11-22', '09:00'), givenAt: at('2026-11-22', '09:05') }];
  const doses = dosesForDay([anti, vitD], logs, '2026-11-22');
  assert.deepEqual(doses.map((d) => `${d.time} ${d.med.name}`), ['09:00 Amoxicilina', '09:00 Vitamina D', '21:00 Amoxicilina']);
  assert.ok(doses[0].log);
  assert.equal(doses[1].log, null);
});

test('estado de cada toma', () => {
  const d = { at: at('2026-11-22', '09:00'), log: null };
  assert.equal(doseStatus(d, at('2026-11-22', '07:30')), 'pendiente');
  assert.equal(doseStatus(d, at('2026-11-22', '08:15')), 'ahora');
  assert.equal(doseStatus(d, at('2026-11-22', '09:45')), 'ahora');
  assert.equal(doseStatus(d, at('2026-11-22', '10:30')), 'retrasada');
  assert.equal(doseStatus({ ...d, log: {} }, at('2026-11-22', '10:30')), 'dada');
});

test('avisos: tomas que llegan en un intervalo (también cruzando medianoche)', () => {
  const due = dueDoses([anti, vitD], [], at('2026-11-22', '08:59'), at('2026-11-22', '09:00'));
  assert.deepEqual(due.map((d) => d.med.name).sort(), ['Amoxicilina', 'Vitamina D']);
  const night = dueDoses([anti], [], at('2026-11-22', '20:00'), at('2026-11-23', '09:30'));
  assert.deepEqual(night.map((d) => d.key), [doseKey('a', '2026-11-22', '21:00'), doseKey('a', '2026-11-23', '09:00')]);
  const given = [{ dose: doseKey('a', '2026-11-22', '21:00') }];
  assert.equal(dueDoses([anti], given, at('2026-11-22', '20:00'), at('2026-11-22', '22:00')).length, 0, 'las dadas no avisan');
});

test('mensaje de WhatsApp editable', () => {
  assert.equal(fillTemplate('{bebe}: {medicamento} {dosis} a las {hora} ({tipo})', { baby: 'Nia', med: vitD, time: '09:00' }),
    'Nia: Vitamina D 5 gotas a las 09:00 (vitamina)');
  assert.match(fillTemplate('', { baby: 'Nia', med: vitD, time: '09:00' }), /toca darle a Nia Vitamina D \(5 gotas\) a las 09:00/);
  assert.equal(whatsappLink('Hola & adiós', '+34 600 11 22 33'), 'https://wa.me/34600112233?text=Hola%20%26%20adi%C3%B3s');
  assert.equal(whatsappLink('Hola', '0034600112233'), 'https://wa.me/34600112233?text=Hola');
  assert.equal(whatsappLink('Hola'), 'https://wa.me/?text=Hola');
});

test('alarmas diarias para el Calendario del iPhone', () => {
  const ics = medsICS([anti, vitD], { now: Date.UTC(2026, 10, 22, 8) });
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3, 'un evento por hora de toma');
  assert.ok(ics.includes('DTSTART:20261120T090000\r\n'), 'hora local flotante');
  assert.ok(ics.includes('RRULE:FREQ=DAILY;UNTIL=20261126T235959'));
  assert.ok(ics.includes('RRULE:FREQ=DAILY\r\n'), 'sin fecha de fin: todos los días');
  assert.equal((ics.match(/TRIGGER:-PT0M/g) || []).length, 3);
  assert.ok(ics.includes('Amoxicilina · 2\\,5 ml'));
  assert.ok(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75));
});
