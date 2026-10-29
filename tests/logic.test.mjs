// Ejecutar con:  npm test   (o  node --test tests/)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dayKey, addDays, monthGrid, daysInMonth, isLeapYear, weekStart,
  combineLocal, diffDays, relativeDayLabel, toTimeInput,
} from '../js/dates.js';
import {
  onDay, bottleSummary, poopSummary, weekRows, validateBottle, validatePoop, nextReference,
} from '../js/stats.js';
import { mergeRecords, toCSV } from '../js/data-io.js';

test('dayKey usa la hora local, no UTC', () => {
  const justAfterMidnight = new Date(2026, 9, 29, 0, 30).getTime();
  assert.equal(dayKey(justAfterMidnight), '2026-10-29');
  const lateNight = new Date(2026, 9, 28, 23, 59).getTime();
  assert.equal(dayKey(lateNight), '2026-10-28');
});

test('combineLocal reconstruye la misma fecha y hora', () => {
  const ms = combineLocal('2026-03-29', '02:30');
  assert.equal(dayKey(ms), '2026-03-29');
  const ms2 = combineLocal('2026-10-25', '23:45');
  assert.equal(dayKey(ms2), '2026-10-25');
  assert.equal(toTimeInput(ms2), '23:45');
});

test('addDays atraviesa cambios de hora y fin de mes/año', () => {
  assert.equal(addDays('2026-03-28', 1), '2026-03-29');
  assert.equal(addDays('2026-03-29', 1), '2026-03-30');
  assert.equal(addDays('2026-10-25', 1), '2026-10-26');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
  assert.equal(addDays('2027-03-01', -1), '2027-02-28');
});

test('años bisiestos y días por mes', () => {
  assert.equal(isLeapYear(2028), true);
  assert.equal(isLeapYear(2026), false);
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(2100), false);
  assert.equal(daysInMonth(2028, 1), 29);
  assert.equal(daysInMonth(2026, 1), 28);
  assert.equal(daysInMonth(2026, 9), 31);
});

test('monthGrid empieza en lunes y contiene todos los días del mes', () => {
  for (const [y, m] of [[2026, 9], [2028, 1], [2026, 1], [2027, 1], [2026, 5]]) {
    const weeks = monthGrid(y, m);
    const cells = weeks.flat();
    assert.ok(weeks.every((w) => w.length === 7));
    const inMonth = cells.filter((c) => c.inMonth);
    assert.equal(inMonth.length, daysInMonth(y, m));
    assert.deepEqual(inMonth.map((c) => c.day), Array.from({ length: daysInMonth(y, m) }, (_, i) => i + 1));
    // la primera celda es lunes
    const [yy, mm, dd] = cells[0].key.split('-').map(Number);
    assert.equal(new Date(yy, mm - 1, dd).getDay(), 1);
    // sin claves duplicadas
    assert.equal(new Set(cells.map((c) => c.key)).size, cells.length);
  }
});

test('weekStart devuelve el lunes', () => {
  assert.equal(weekStart('2026-10-29'), '2026-10-26'); // jueves
  assert.equal(weekStart('2026-11-01'), '2026-10-26'); // domingo
  assert.equal(weekStart('2026-10-26'), '2026-10-26'); // lunes
});

test('diffDays y etiquetas relativas', () => {
  assert.equal(diffDays('2026-10-25', '2026-10-26'), 1); // cambio de hora
  assert.equal(relativeDayLabel('2026-10-29', '2026-10-29'), 'Hoy');
  assert.equal(relativeDayLabel('2026-10-28', '2026-10-29'), 'Ayer');
  assert.equal(relativeDayLabel('2026-10-26', '2026-10-29'), 'Hace 3 días');
});

const b = (y, mo, d, h, mi, prepared, taken, id = Math.random().toString(36)) =>
  ({ id, at: new Date(y, mo, d, h, mi).getTime(), prepared, taken, notes: '' });

test('totales diarios calculados desde los registros', () => {
  const all = [
    b(2026, 9, 29, 8, 10, 180, 150),
    b(2026, 9, 29, 12, 35, 150, 120),
    b(2026, 9, 28, 23, 50, 150, 150),
    b(2026, 9, 29, 0, 5, 120, 100),
  ];
  const today = onDay(all, '2026-10-29');
  assert.equal(today.length, 3);
  assert.deepEqual(today.map((r) => toTimeInput(r.at)), ['00:05', '08:10', '12:35']);
  const s = bottleSummary(today);
  assert.equal(s.count, 3);
  assert.equal(s.taken, 370);
  assert.equal(s.prepared, 450);
  assert.equal(s.avg, 123);
  assert.equal(toTimeInput(s.last.at), '12:35');
  assert.deepEqual(bottleSummary([]), { count: 0, taken: 0, prepared: 0, avg: 0, last: null });
});

test('editar o eliminar cambia los totales (no hay cifras guardadas)', () => {
  const all = [b(2026, 9, 29, 8, 0, 150, 150, 'a'), b(2026, 9, 29, 11, 0, 150, 90, 'b')];
  assert.equal(bottleSummary(onDay(all, '2026-10-29')).taken, 240);
  const edited = all.map((r) => (r.id === 'b' ? { ...r, taken: 120 } : r));
  assert.equal(bottleSummary(onDay(edited, '2026-10-29')).taken, 270);
  const removed = edited.filter((r) => r.id !== 'a');
  assert.equal(bottleSummary(onDay(removed, '2026-10-29')).taken, 120);
});

test('resumen semanal', () => {
  const bottles = [b(2026, 9, 26, 9, 0, 150, 120), b(2026, 9, 26, 13, 0, 150, 150), b(2026, 10, 1, 9, 0, 100, 80)];
  const poops = [{ id: 'p', at: new Date(2026, 9, 27, 10, 0).getTime(), consistency: 'blanda' }];
  const rows = weekRows(bottles, poops, '2026-10-26');
  assert.equal(rows.length, 7);
  assert.equal(rows[0].taken, 270);
  assert.equal(rows[0].count, 2);
  assert.equal(rows[1].poops, 1);
  assert.equal(rows[6].key, '2026-11-01');
  assert.equal(rows[6].taken, 80);
});

test('validaciones', () => {
  const at = Date.now();
  assert.equal(validateBottle({ at, prepared: 150, taken: 120 }), null);
  assert.equal(validateBottle({ at, prepared: 150, taken: 0 }), null);
  assert.match(validateBottle({ at, prepared: 100, taken: 120 }), /superar/);
  assert.match(validateBottle({ at, prepared: 0, taken: 0 }), /preparó/);
  assert.match(validateBottle({ at: NaN, prepared: 100, taken: 10 }), /fecha/);
  assert.equal(validatePoop({ at, consistency: 'liquida' }), null);
  assert.match(validatePoop({ at, consistency: 'x' }), /consistencia/);
  assert.equal(poopSummary([]).count, 0);
  assert.equal(nextReference(0, 180), null);
  assert.equal(nextReference(1000, 180), 1000 + 180 * 60000);
});

test('importar copia sin duplicados: gana la versión más reciente', () => {
  const local = [{ id: '1', at: 1, updatedAt: 10, taken: 100 }, { id: '2', at: 2, updatedAt: 10 }];
  const incoming = [{ id: '1', at: 1, updatedAt: 20, taken: 120 }, { id: '2', at: 2, updatedAt: 5 }, { id: '3', at: 3, updatedAt: 1 }];
  const { merged, added, updated } = mergeRecords(local, incoming);
  assert.equal(merged.length, 3);
  assert.equal(merged.find((r) => r.id === '1').taken, 120);
  assert.equal(merged.find((r) => r.id === '2').updatedAt, 10);
  assert.equal(added, 1);
  assert.equal(updated, 1);
});

test('CSV con comillas y saltos de línea escapados', () => {
  const csv = toCSV(
    [{ id: 'x', at: new Date(2026, 9, 29, 8, 5).getTime(), prepared: 150, taken: 120, notes: 'Dijo "más"\nluego durmió', createdAt: 0, updatedAt: 0 }],
    [{ id: 'y', at: new Date(2026, 9, 29, 10, 20).getTime(), consistency: 'blanda', notes: 'amarilla; poca', createdAt: 0, updatedAt: 0 }],
  );
  const lines = csv.replace(/^﻿/, '').split('\r\n');
  assert.match(lines[0], /^tipo;fecha;hora/);
  assert.ok(csv.includes('"Dijo ""más""\nluego durmió"'));
  assert.ok(csv.includes('biberon;2026-10-29;08:05;150;120'));
  assert.ok(csv.includes('deposicion;2026-10-29;10:20;;;Blanda;"amarilla; poca"'));
});

import { addMonths, monthsBetween, ageText, ageParts } from '../js/dates.js';

test('addMonths: meses cortos, bisiestos y cambio de año', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2028-01-31', 1), '2028-02-29');
  assert.equal(addMonths('2026-01-31', 2), '2026-03-31');
  assert.equal(addMonths('2026-11-15', 2), '2027-01-15');
  assert.equal(addMonths('2028-02-29', 12), '2029-02-28');
  assert.equal(addMonths('2026-05-10', 0), '2026-05-10');
});

test('meses cumplidos y edad', () => {
  assert.equal(monthsBetween('2026-05-10', '2026-06-09'), 0);
  assert.equal(monthsBetween('2026-05-10', '2026-06-10'), 1);
  assert.equal(monthsBetween('2026-01-31', '2026-02-28'), 1);
  assert.equal(monthsBetween('2026-01-31', '2026-02-27'), 0);
  assert.equal(monthsBetween('2026-05-10', '2027-05-10'), 12);
  assert.equal(monthsBetween('2026-12-01', '2026-11-01'), 0);
  assert.equal(ageText('2026-10-29', '2026-10-29'), 'Recién nacida');
  assert.equal(ageText('2026-10-17', '2026-10-29'), '12 días');
  assert.equal(ageText('2026-10-28', '2026-10-29'), '1 día');
  assert.equal(ageText('2026-07-24', '2026-10-29'), '3 meses y 5 días');
  assert.equal(ageText('2026-09-29', '2026-10-29'), '1 mes');
  assert.equal(ageText('2025-08-29', '2026-10-29'), '1 año y 2 meses');
  assert.equal(ageText('2025-10-29', '2026-10-29'), '1 año');
  assert.equal(ageText('2026-11-05', '2026-10-29'), '', 'fecha futura: sin edad');
  assert.equal(ageParts('2026-07-24', '2026-10-29').totalDays, 97);
});
