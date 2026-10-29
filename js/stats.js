// Cálculos derivados. Ningún total se almacena: todo sale de los registros.
import { dayKey, addDays } from './dates.js';

export const CONSISTENCIES = {
  liquida: { label: 'Muy líquida', short: 'Muy líquida' },
  blanda: { label: 'Blanda', short: 'Blanda' },
  normal: { label: 'Normal', short: 'Normal' },
  dura: { label: 'Dura', short: 'Dura' },
};

export const byTimeAsc = (a, b) => a.at - b.at;
export const byTimeDesc = (a, b) => b.at - a.at;

export function onDay(records, key) {
  return records.filter((r) => dayKey(r.at) === key).sort(byTimeAsc);
}

export function groupByDay(records) {
  const map = new Map();
  for (const r of records) {
    const k = dayKey(r.at);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  for (const list of map.values()) list.sort(byTimeAsc);
  return map;
}

export function bottleSummary(bottles) {
  const count = bottles.length;
  const taken = bottles.reduce((s, b) => s + (Number(b.taken) || 0), 0);
  const prepared = bottles.reduce((s, b) => s + (Number(b.prepared) || 0), 0);
  const last = bottles.reduce((m, b) => (!m || b.at > m.at ? b : m), null);
  return {
    count,
    taken,
    prepared,
    avg: count ? Math.round(taken / count) : 0,
    last,
  };
}

export function poopSummary(poops) {
  const last = poops.reduce((m, p) => (!m || p.at > m.at ? p : m), null);
  return { count: poops.length, last };
}

/** Siete filas (lunes→domingo) con los totales de cada día. */
export function weekRows(bottles, poops, startKey) {
  const b = groupByDay(bottles);
  const p = groupByDay(poops);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(startKey, i);
    const bs = bottleSummary(b.get(key) || []);
    const ps = p.get(key) || [];
    return { key, ...bs, poops: ps.length, poopList: ps };
  });
}

/** Referencia orientativa: último biberón + intervalo elegido por la familia. */
export function nextReference(lastAt, intervalMin) {
  if (!lastAt || !intervalMin) return null;
  return lastAt + intervalMin * 60000;
}

/** Valida un biberón. Devuelve un mensaje de error o null. */
export function validateBottle({ at, prepared, taken }) {
  if (!Number.isFinite(at)) return 'Indica la fecha y la hora.';
  if (!Number.isFinite(prepared) || prepared <= 0) return 'Indica cuánta leche se preparó.';
  if (!Number.isFinite(taken) || taken < 0) return 'Indica cuánta leche tomó.';
  if (prepared > 1000 || taken > 1000) return 'La cantidad máxima es 1000 ml.';
  if (taken > prepared) return 'Lo tomado no puede superar lo preparado.';
  return null;
}

export function validatePoop({ at, consistency }) {
  if (!Number.isFinite(at)) return 'Indica la fecha y la hora.';
  if (!CONSISTENCIES[consistency]) return 'Elige la consistencia.';
  return null;
}
