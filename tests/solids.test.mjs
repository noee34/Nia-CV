// Sólidos: validación, primera vez, alimentos probados y resumen del día.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSolid, isNewFood, foodsSummary, daySummary, foodKey } from '../js/solids.js';

const r = (id, food, at, tolerance = 'bien', over = {}) => ({ id, food, at, tolerance, amount: 'todo', ...over });

test('validación', () => {
  assert.equal(validateSolid(r('a', 'Puré de calabaza', 1)), null);
  assert.match(validateSolid(r('a', '  ', 1)), /qué comió/);
  assert.match(validateSolid(r('a', 'Pera', NaN)), /fecha/);
  assert.match(validateSolid(r('a', 'Pera', 1, 'fatal')), /sentó/);
  assert.match(validateSolid(r('a', 'Pera', 1, 'bien', { amount: 'mucho' })), /cuánto/);
});

test('el nombre se agrupa sin importar mayúsculas ni espacios', () => {
  assert.equal(foodKey('  Puré de   Calabaza '), 'puré de calabaza');
  const list = [r('1', 'Puré de calabaza', 1)];
  assert.equal(isNewFood(list, 'puré de  CALABAZA'), false);
  assert.equal(isNewFood(list, 'Plátano'), true);
  assert.equal(isNewFood(list, 'Puré de calabaza', '1'), true, 'al editar el único registro sigue siendo nuevo');
});

test('alimentos probados: los que sentaron mal primero', () => {
  const list = [
    r('1', 'Calabaza', 100), r('2', 'calabaza', 300), r('3', 'Huevo', 200, 'mal'),
    r('4', 'Pera', 400, 'regular'), r('5', 'Pera', 500, 'bien'),
  ];
  const s = foodsSummary(list);
  assert.deepEqual(s.map((f) => f.key), ['huevo', 'pera', 'calabaza']);
  const pera = s.find((f) => f.key === 'pera');
  assert.equal(pera.count, 2);
  assert.equal(pera.worst, 'regular');
  assert.equal(pera.badCount, 1);
  assert.equal(pera.lastTolerance, 'bien');
  assert.equal(s.find((f) => f.key === 'calabaza').first, 100);
});

test('resumen del día', () => {
  assert.deepEqual(daySummary([]), { count: 0, newFoods: 0, worst: null });
  assert.deepEqual(daySummary([r('1', 'A', 1, 'bien', { firstTime: true }), r('2', 'B', 2, 'regular')]), { count: 2, newFoods: 1, worst: 'regular' });
});
