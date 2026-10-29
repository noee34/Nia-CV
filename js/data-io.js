// Exportación CSV, copia de seguridad JSON e importación sin duplicados.
import { dayKey, toTimeInput } from './dates.js';
import { CONSISTENCIES, byTimeAsc } from './stats.js';

export const BACKUP_FORMAT = 'nia-cv-backup';
export const BACKUP_VERSION = 1;

function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const iso = (ms) => (ms ? new Date(ms).toISOString() : '');

/**
 * Un único CSV con biberones y deposiciones, ordenado por fecha.
 * Separador ';' y BOM para que Numbers y Excel en español lo abran bien.
 */
export function toCSV(bottles, poops) {
  const header = ['tipo', 'fecha', 'hora', 'preparado_ml', 'tomado_ml', 'consistencia', 'observaciones', 'creado', 'modificado', 'id'];
  const rows = [
    ...bottles.map((r) => ({ ...r, _t: 'biberon' })),
    ...poops.map((r) => ({ ...r, _t: 'deposicion' })),
  ].sort(byTimeAsc).map((r) => [
    r._t,
    dayKey(r.at),
    toTimeInput(r.at),
    r._t === 'biberon' ? r.prepared : '',
    r._t === 'biberon' ? r.taken : '',
    r._t === 'deposicion' ? (CONSISTENCIES[r.consistency]?.label ?? r.consistency) : '',
    r.notes || '',
    iso(r.createdAt),
    iso(r.updatedAt),
    r.id,
  ].map(csvCell).join(';'));
  return '﻿' + [header.join(';'), ...rows].join('\r\n');
}

export function toBackup({ bottles, poops, settings }) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    bottles,
    poops,
  };
}

export function parseBackup(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('El archivo no es una copia válida.'); }
  if (!data || data.format !== BACKUP_FORMAT || !Array.isArray(data.bottles) || !Array.isArray(data.poops)) {
    throw new Error('Este archivo no parece una copia de Nia CV.');
  }
  const okBottle = (r) => r && typeof r.id === 'string' && Number.isFinite(r.at) && Number.isFinite(r.prepared) && Number.isFinite(r.taken);
  const okPoop = (r) => r && typeof r.id === 'string' && Number.isFinite(r.at) && CONSISTENCIES[r.consistency];
  return { ...data, bottles: data.bottles.filter(okBottle), poops: data.poops.filter(okPoop) };
}

/** Fusiona por id; si existe en ambos lados gana el `updatedAt` más reciente. */
export function mergeRecords(local, incoming) {
  const map = new Map(local.map((r) => [r.id, r]));
  let added = 0, updated = 0;
  for (const r of incoming) {
    const cur = map.get(r.id);
    if (!cur) { map.set(r.id, r); added++; }
    else if ((r.updatedAt || 0) > (cur.updatedAt || 0)) { map.set(r.id, r); updated++; }
  }
  return { merged: [...map.values()], added, updated };
}
