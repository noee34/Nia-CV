// SÓLIDOS: registro de comidas cuando el bebé empieza a comer (alimentación
// complementaria): qué comió, cuánto, si le gustó y cómo le sentó.
// Lógica pura (sin pantalla), probada en tests/solids.test.mjs.

export const TEXTURES = {
  pure: 'Puré',
  triturado: 'Triturado',
  chafado: 'Chafado',
  trozos: 'Trozos',
};

/** ¿Cuánto comió? De menos a más. */
export const AMOUNTS = {
  nada: { label: 'Nada', level: 0 },
  poco: { label: 'Poco', level: 1 },
  mitad: { label: 'La mitad', level: 2 },
  casi: { label: 'Casi todo', level: 3 },
  todo: { label: 'Todo', level: 4 },
};

/** ¿Le gustó? (opcional) */
export const LIKES = {
  encanto: 'Le encantó',
  gusto: 'Le gustó',
  regular: 'Regular',
  no: 'No le gustó',
};

/** ¿Cómo le sentó? De mejor a peor. */
export const TOLERANCE = {
  bien: { label: 'Le sentó bien', short: 'Bien', rank: 0 },
  regular: { label: 'Regular', short: 'Regular', rank: 1 },
  mal: { label: 'Le sentó mal', short: 'Mal', rank: 2 },
};

export const SYMPTOMS = [
  'Gases', 'Vómito', 'Diarrea', 'Estreñimiento', 'Ronchas o erupción', 'Picor',
  'Hinchazón', 'Mucosidad', 'Irritable',
];

/** Nombre normalizado para agrupar ("Puré de calabaza" = "puré de  Calabaza"). */
export const foodKey = (name) => String(name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-ES');

export function validateSolid(s) {
  if (!Number.isFinite(s.at)) return 'Indica la fecha y la hora.';
  if (!foodKey(s.food)) return 'Escribe qué comió.';
  if (s.food.trim().length > 60) return 'El nombre es demasiado largo (máximo 60 caracteres).';
  if (!AMOUNTS[s.amount]) return 'Indica cuánto comió.';
  if (!TOLERANCE[s.tolerance]) return 'Indica cómo le sentó.';
  if (s.texture && !TEXTURES[s.texture]) return 'Textura no válida.';
  if (s.liked && !LIKES[s.liked]) return 'Respuesta no válida.';
  return null;
}

/** ¿Es la primera vez que toma este alimento (sin contar el propio registro)? */
export function isNewFood(records, food, exceptId = null) {
  const k = foodKey(food);
  return Boolean(k) && !records.some((r) => r.id !== exceptId && foodKey(r.food) === k);
}

/**
 * Alimentos probados: [{ key, name, count, first, last, worst, badCount, lastTolerance }],
 * los que le sentaron mal primero y después por última vez que se tomaron.
 */
export function foodsSummary(records) {
  const map = new Map();
  for (const r of [...records].sort((a, b) => a.at - b.at)) {
    const k = foodKey(r.food);
    if (!k) continue;
    const f = map.get(k) || { key: k, name: r.food.trim(), count: 0, first: r.at, last: r.at, worst: 'bien', badCount: 0, lastTolerance: 'bien' };
    f.count += 1;
    f.last = r.at;
    f.name = r.food.trim(); // el nombre más reciente
    f.lastTolerance = r.tolerance;
    if (TOLERANCE[r.tolerance]?.rank > TOLERANCE[f.worst].rank) f.worst = r.tolerance;
    if (r.tolerance !== 'bien') f.badCount += 1;
    map.set(k, f);
  }
  return [...map.values()].sort((a, b) => TOLERANCE[b.worst].rank - TOLERANCE[a.worst].rank || b.last - a.last);
}

/** Resumen de un día: número de comidas, alimentos nuevos y la peor tolerancia. */
export function daySummary(dayRecords) {
  const worst = dayRecords.reduce((w, r) => (TOLERANCE[r.tolerance]?.rank > TOLERANCE[w].rank ? r.tolerance : w), 'bien');
  return {
    count: dayRecords.length,
    newFoods: dayRecords.filter((r) => r.firstTime).length,
    worst: dayRecords.length ? worst : null,
  };
}
