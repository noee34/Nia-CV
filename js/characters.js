// La familia de Nia CV: una familia de CANICHES, dibujados en SVG.
//   · Nube   — caniche gris plata, collar con medalla de estrella
//   · Canela — caniche albaricoque, lazo azul en el pompón
//   · Mamá   — caniche crema, con una flor
//   · Papá   — caniche chocolate, con bufanda
// Diseños propios de Nia CV: no reproducen personajes de ninguna serie.
//
// Rasgos de caniche: pelo rizado (rizos alrededor de cada parte del cuerpo),
// cara y hocico sin pelo y alargados, pompón en la cabeza, orejas largas
// rizadas, patas finas con pompones y cola con pompón. Cuerpo entero, de una pieza.

const INK = '#4E443E';
const CREAM = '#FFFDF9';
const BLUSH = '#E9AE9A';

export const FAMILY = {
  nube: { name: 'Nube', fur: '#B9C7D0', shade: '#93A6B3', face: '#C9D5DC', nose: '#4E4A4C', collar: '#8EAFC0' },
  canela: { name: 'Canela', fur: '#EDBE97', shade: '#D39A72', face: '#F2CBAA', nose: '#7A5245', bow: '#8EAFC0' },
  mama: { name: 'Mamá', fur: '#F1E6D4', shade: '#D8C6AA', face: '#F6EEE2', nose: '#6B5548', flower: '#D7A18C' },
  papa: { name: 'Papá', fur: '#9F7F69', shade: '#80634F', face: '#B0917C', nose: '#3F3330', scarf: '#B8D7E8' },
};

/* ------------------------------------------------------------------ */
/* Pelo rizado                                                          */
/* ------------------------------------------------------------------ */

/** Generador pseudoaleatorio estable (mismo dibujo siempre). */
function rng(seed) {
  let s = Math.abs(Math.floor(seed * 9301 + 49297)) % 233280 || 1;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}
const f1 = (v) => Math.round(v * 10) / 10;

/** Masa de pelo rizado: un óvalo rodeado de rizos, con textura de bucles. */
function curly(cx, cy, rx, ry, c, { r = 6, n = 12, rot = 0, curls = true } = {}) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n + rot;
    out += `<circle cx="${f1(cx + (rx - r * 0.45) * Math.cos(a))}" cy="${f1(cy + (ry - r * 0.45) * Math.sin(a))}" r="${r}" fill="${c.fur}" stroke="${c.shade}" stroke-width="1.1"/>`;
  }
  out += `<ellipse cx="${cx}" cy="${cy}" rx="${f1(rx - r * 0.5)}" ry="${f1(ry - r * 0.5)}" fill="${c.fur}"/>`;
  if (curls) {
    const rand = rng(cx * 7 + cy * 13 + rx);
    const k = Math.max(2, Math.round((rx * ry) / 90));
    for (let i = 0; i < k; i++) {
      const x = cx + (rand() - 0.5) * rx * 1.2;
      const y = cy + (rand() - 0.5) * ry * 1.2;
      out += `<path d="M${f1(x)} ${f1(y)}a2.6 2.6 0 1 1 3.8 2.3" stroke="${c.shade}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".6"/>`;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Cabeza (se usa sentado y tumbado)                                    */
/* ------------------------------------------------------------------ */

function headParts(c, { eyes = 'open', mouth = 'smile' } = {}) {
  const e = eyes === 'open'
    ? `<ellipse cx="52.5" cy="58" rx="2.7" ry="3.2" fill="${INK}"/><ellipse cx="67.5" cy="58" rx="2.7" ry="3.2" fill="${INK}"/>
       <circle cx="53.5" cy="56.8" r="1" fill="#fff"/><circle cx="68.5" cy="56.8" r="1" fill="#fff"/>`
    : `<path d="M49 59q3.5 ${eyes === 'sleep' ? 2.6 : -3} 7 0M64 59q3.5 ${eyes === 'sleep' ? 2.6 : -3} 7 0" stroke="${INK}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
  const m = mouth === 'open'
    ? `<path d="M55.5 83.5q4.5 6 9 0Z" fill="#9C5A4E"/><path d="M57.8 85.6q2.2 2.4 4.4 0" fill="#E2A28E"/>`
    : `<path d="M60 82.6q-2.8 3-5.6 1.2M60 82.6q2.8 3 5.6 1.2" stroke="${c.nose}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  return `
    ${curly(60, 50, 21, 19, c, { r: 6, n: 13 })}
    ${curly(60, 29, 15, 11, c, { r: 5, n: 11, rot: 0.3 })}
    ${curly(36, 68, 10, 23, c, { r: 5, n: 12 })}
    ${curly(84, 68, 10, 23, c, { r: 5, n: 12, rot: 0.25 })}
    <path d="M47 56c0-9 6-13 13-13s13 4 13 13c0 7-3 11-5 15l-1 9c-1 5-4 7-7 7s-6-2-7-7l-1-9c-2-4-5-8-5-15Z" fill="${c.face}"/>
    <path d="M52 66c2 2 5 3 8 3s6-1 8-3" stroke="${c.shade}" stroke-width=".9" fill="none" opacity=".45"/>
    ${e}
    <ellipse cx="60" cy="78.6" rx="4" ry="3" fill="${c.nose}"/>
    <ellipse cx="58.8" cy="77.7" rx="1.2" ry=".7" fill="#fff" opacity=".5"/>
    ${m}
    <ellipse cx="48.5" cy="67" rx="3.4" ry="2.2" fill="${BLUSH}" opacity=".55"/>
    <ellipse cx="71.5" cy="67" rx="3.4" ry="2.2" fill="${BLUSH}" opacity=".55"/>
    ${c.bow ? `<g transform="translate(60 21)"><path d="M0 0-11-6v12Z" fill="${c.bow}"/><path d="M0 0 11-6v12Z" fill="${c.bow}"/><circle r="3.2" fill="${c.bow}"/><circle r="1.4" fill="#fff" opacity=".6"/></g>` : ''}
    ${c.flower ? `<g transform="translate(74 25)">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${f1(5.5 * Math.cos((a * Math.PI) / 180))}" cy="${f1(5.5 * Math.sin((a * Math.PI) / 180))}" r="3.7" fill="${c.flower}"/>`).join('')}<circle r="2.8" fill="#F4E3B5"/></g>` : ''}`;
}

/* ------------------------------------------------------------------ */
/* Caniche sentado, de cuerpo entero (caja 120 × 170)                   */
/* ------------------------------------------------------------------ */

export function pupSVG(c, { eyes = 'open', mouth = 'smile', hold = '', diaper = false, wave = false } = {}) {
  const leg = (x) => `<rect x="${x - 5.5}" y="116" width="11" height="42" rx="5.5" fill="${c.fur}" stroke="${c.shade}" stroke-width="1"/>
    ${curly(x, 159, 9, 6.5, c, { r: 3.6, n: 9, curls: false })}`;
  const raised = `<path d="M74 108 96 80" stroke="${c.shade}" stroke-width="12.5" stroke-linecap="round"/>
    <path d="M74 108 96 80" stroke="${c.fur}" stroke-width="10.5" stroke-linecap="round"/>
    ${curly(97, 77, 8, 8, c, { r: 3.5, n: 8, curls: false })}`;
  const holdingPaws = `${curly(45, 125, 7.5, 7, c, { r: 3.4, n: 8, curls: false })}${curly(75, 125, 7.5, 7, c, { r: 3.4, n: 8, curls: false })}`;
  return `
    <path d="M86 132c10-6 15-16 16-30" stroke="${c.shade}" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M86 132c10-6 15-16 16-30" stroke="${c.fur}" stroke-width="4" stroke-linecap="round" fill="none"/>
    ${curly(102, 96, 9, 9, c, { r: 4, n: 9 })}
    ${curly(36, 146, 17, 15, c, { r: 6, n: 11 })}
    ${curly(84, 146, 17, 15, c, { r: 6, n: 11, rot: 0.3 })}
    ${curly(60, 124, 24, 30, c, { r: 7, n: 14 })}
    ${diaper ? `<path d="M30 140h60c0 16-13 25-30 25s-30-9-30-25Z" fill="${CREAM}" stroke="${c.shade}" stroke-width="1.2"/><path d="M42 142h36" stroke="#B8D7E8" stroke-width="2.4" stroke-linecap="round"/>` : ''}
    ${hold ? '' : leg(50)}
    ${hold || wave ? '' : leg(70)}
    ${curly(60, 94, 14, 14, c, { r: 5, n: 10, curls: false })}
    ${c.collar ? `<path d="M47 101q13 7 26 0" stroke="${c.collar}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M60 104l1.8 3.6 4 .5-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.5Z" fill="#E7C98A"/>` : ''}
    ${c.scarf ? `<path d="M44 98q16 10 32 0l-1 7q-15 9-30 0Z" fill="${c.scarf}"/><path d="M68 103l5 17-8 1-3-16Z" fill="${c.scarf}"/>` : ''}
    ${hold ? `${hold}${holdingPaws}` : ''}
    ${wave ? raised : ''}
    ${headParts(c, { eyes, mouth })}`;
}

/** Caniche tumbado durmiendo, de cuerpo entero (caja 200 × 120). */
export function sleepingPupSVG(c) {
  return `
    <ellipse cx="102" cy="108" rx="92" ry="12" fill="#E8DED1"/>
    <path d="M168 92c10-2 16-8 18-16" stroke="${c.fur}" stroke-width="4" stroke-linecap="round" fill="none"/>
    ${curly(186, 72, 8, 8, c, { r: 3.6, n: 8 })}
    ${curly(150, 90, 22, 15, c, { r: 6, n: 11 })}
    ${curly(108, 88, 46, 18, c, { r: 7, n: 18 })}
    ${curly(68, 103, 12, 6.5, c, { r: 3.6, n: 9, curls: false })}
    ${curly(90, 104, 12, 6.5, c, { r: 3.6, n: 9, curls: false })}
    <g transform="translate(14 22) scale(.86) rotate(-6 60 60)">${headParts(c, { eyes: 'sleep' })}</g>`;
}

/* ------------------------------------------------------------------ */
/* Decoración                                                          */
/* ------------------------------------------------------------------ */

const star = (x, y, s = 1, color = '#D7A18C') =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0-7 1.7-1.7 7 0 1.7 1.7 0 7-1.7 1.7-7 0-1.7-1.7Z" fill="${color}"/>`;
const cloud = (x, y, s = 1, fill = CREAM) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M10 40a14 14 0 0 1 4-27.4A20 20 0 0 1 52 8a16 16 0 0 1 26 12 12 12 0 0 1-2 20Z" fill="${fill}"/>`;
const flower = (x, y, s = 1, petal = '#EDCDBF') =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0v12" stroke="#93A28B" stroke-width="1.6"/>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${f1(4 * Math.cos((a * Math.PI) / 180))}" cy="${f1(4 * Math.sin((a * Math.PI) / 180))}" r="3.2" fill="${petal}"/>`).join('')}<circle r="2.2" fill="#F4E3B5"/></g>`;
const ball = (x, y, r = 12) =>
  `<g transform="translate(${x} ${y})"><circle r="${r}" fill="#FFFDF9"/><path d="M${-r} 0a${r} ${r} 0 0 0 ${2 * r} 0" fill="#B8D7E8"/><path d="M${f1(-r * 0.35)} ${f1(-r * 0.94)}q${f1(r * 0.7)} ${r} 0 ${f1(r * 1.88)}" stroke="#D7A18C" stroke-width="2.4" fill="none"/><circle r="${r}" fill="none" stroke="#8A7B70" stroke-opacity=".25"/></g>`;
const sun = (x, y, r = 17) =>
  `<g transform="translate(${x} ${y})">${Array.from({ length: 8 }, (_, i) => `<path d="M0 ${-r - 5}v-6" stroke="#EBCB8B" stroke-width="3" stroke-linecap="round" transform="rotate(${i * 45})"/>`).join('')}<circle r="${r}" fill="#F4DFA6"/><path d="M-7.5-1q3-3 6 0M1.5-1q3-3 6 0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M-4 5q4 4 8 0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="-10" cy="5" r="2.6" fill="${BLUSH}"/><circle cx="10" cy="5" r="2.6" fill="${BLUSH}"/></g>`;
const butterfly = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s}) rotate(-12)"><ellipse cx="-6" cy="-4" rx="7" ry="6" fill="#B8D7E8"/><ellipse cx="6" cy="-4" rx="7" ry="6" fill="#B8D7E8"/><ellipse cx="-5" cy="5" rx="5" ry="4" fill="#EDCDBF"/><ellipse cx="5" cy="5" rx="5" ry="4" fill="#EDCDBF"/><rect x="-1.2" y="-8" width="2.4" height="17" rx="1.2" fill="${INK}"/><path d="M0-8q-3-6-6-7M0-8q3-6 6-7" stroke="${INK}" stroke-width="1" fill="none"/></g>`;
const heart = (x, y, s = 1, color = '#EDB9A6') =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6S-8 1-8-4a4.4 4.4 0 0 1 8-2.4A4.4 4.4 0 0 1 8-4c0 5-8 10-8 10Z" fill="${color}"/>`;
const pawPrint = (x, y, s = 1, color = '#B7C2AE', rot = 0) =>
  `<g transform="translate(${x} ${y}) scale(${s}) rotate(${rot})" fill="${color}"><ellipse cy="4" rx="5" ry="4.2"/><circle cx="-6" cy="-3" r="2.2"/><circle cx="-2" cy="-7" r="2.2"/><circle cx="2" cy="-7" r="2.2"/><circle cx="6" cy="-3" r="2.2"/></g>`;
const kite = (x, y) =>
  `<g transform="translate(${x} ${y}) rotate(14)"><path d="M0-18 13 0 0 22-13 0Z" fill="#EDCDBF"/><path d="M0-18 13 0H-13Z" fill="#D7A18C" opacity=".55"/><path d="M0-18V22M-13 0h26" stroke="${CREAM}" stroke-width="1.2"/><path d="M0 22q-6 10 2 16t-2 18" stroke="${INK}" stroke-width="1" fill="none" opacity=".6"/></g>`;
const bottle = (x, y, s = 1, rot = 0) =>
  `<g transform="translate(${x} ${y}) scale(${s}) rotate(${rot})"><rect x="-9" y="-8" width="18" height="30" rx="6" fill="#FFFDF9" stroke="#8EAFC0" stroke-width="1.6"/><rect x="-9" y="6" width="18" height="16" rx="5" fill="#F8F1E4"/><path d="M-9 0h5M-9 6h4M-9 12h5" stroke="#8EAFC0" stroke-width="1.2"/><rect x="-7" y="-14" width="14" height="7" rx="2" fill="#B8D7E8"/><path d="M-4-14q4-10 8 0Z" fill="#EDCDBF"/></g>`;
const balloon = (x, y, label, color = '#B8D7E8') =>
  `<g transform="translate(${x} ${y})"><path d="M0 22q-4 10 2 18" stroke="${INK}" stroke-width="1" fill="none" opacity=".5"/><ellipse rx="15" ry="18" fill="${color}"/><path d="M-3 18h6l-3 4Z" fill="${color}"/><ellipse cx="-5" cy="-7" rx="3.5" ry="5" fill="#fff" opacity=".45"/><text y="6" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="600" font-size="17" fill="${INK}">${label}</text></g>`;
const hills = (w, h, top = 0.68) => `
  <path d="M0 ${f1(h * top)} Q${f1(w * 0.25)} ${f1(h * (top - 0.14))} ${f1(w * 0.52)} ${f1(h * (top - 0.02))} T${w} ${f1(h * (top - 0.06))} V${h} H0Z" fill="#D3DBCB"/>
  <path d="M0 ${f1(h * (top + 0.14))} Q${f1(w * 0.35)} ${f1(h * (top + 0.02))} ${f1(w * 0.62)} ${f1(h * (top + 0.12))} T${w} ${f1(h * (top + 0.1))} V${h} H0Z" fill="#B7C2AE"/>`;

const place = (svg, x, y, s, flip = false) =>
  `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})${flip ? ' translate(-120 0)' : ''}">${svg}</g>`;

/* ------------------------------------------------------------------ */
/* Escenas                                                             */
/* ------------------------------------------------------------------ */

const F = FAMILY;
const scene = (vb, label, body) =>
  `<svg class="scene" viewBox="${vb}" role="img" aria-label="${label}" preserveAspectRatio="xMidYMax meet">${body}</svg>`;

/** HOY: Nube y Canela juegan en el jardín con una pelota y una cometa. */
export const gardenScene = () => scene('0 0 340 180', 'Ilustración: Nube y Canela, dos caniches, juegan en el jardín', `
  ${sun(294, 34)}
  ${cloud(22, 12, 0.9)}${cloud(150, 4, 0.6)}
  ${kite(226, 32)}
  ${hills(340, 180)}
  ${flower(24, 150, 1.1)}${flower(314, 138, 1, '#B8D7E8')}${flower(200, 160, 0.9)}
  ${pawPrint(150, 170, 0.7, '#9FAE98', -20)}${pawPrint(170, 162, 0.7, '#9FAE98', -10)}
  ${place(pupSVG(F.nube, { eyes: 'open', mouth: 'open', wave: true }), 44, 48, 0.76)}
  ${place(pupSVG(F.canela, { eyes: 'closed', mouth: 'open' }), 234, 62, 0.66, true)}
  ${ball(182, 152, 13)}
  ${heart(146, 64, 1.1)}${star(126, 36, 0.9)}${star(320, 92, 0.7, '#B7C2AE')}`);

/** BIBERONES: Nube sujeta su biberón. */
export const bottleScene = () => scene('0 0 340 160', 'Ilustración: Nube, un caniche gris, con su biberón', `
  ${cloud(240, 8, 0.8)}${cloud(28, 22, 0.55)}
  ${hills(340, 160, 0.74)}
  ${flower(40, 136, 1)}${flower(300, 128, 1, '#B8D7E8')}
  ${place(pupSVG(F.nube, { eyes: 'closed', hold: bottle(60, 116, 1.45, -8) }), 122, 28, 0.76)}
  ${heart(236, 62, 1.2)}${heart(256, 44, 0.8, '#B8D7E8')}${star(96, 46, 0.9)}${star(272, 96, 0.7, '#B7C2AE')}`);

/** CACAS: Canela con su pañal y una mariposa. */
export const diaperScene = () => scene('0 0 340 160', 'Ilustración: Canela, una caniche albaricoque, con su pañal', `
  ${sun(48, 34, 14)}${cloud(250, 12, 0.7)}
  ${hills(340, 160, 0.74)}
  ${flower(70, 138, 1.1, '#B8D7E8')}${flower(286, 134, 1)}${flower(306, 142, 0.8, '#B8D7E8')}
  ${place(pupSVG(F.canela, { eyes: 'open', mouth: 'open', diaper: true }), 122, 30, 0.74)}
  ${butterfly(238, 50, 1.1)}${pawPrint(92, 150, 0.6, '#9FAE98', 15)}`);

/** DIARIO: la familia, sentada en la colina bajo la luna y las estrellas. */
export const familyScene = ({ wave = false } = {}) => scene('0 0 340 180', 'Ilustración: la familia de caniches de Nia CV', `
  <path d="M300 22a20 20 0 1 0 14 34 16 16 0 1 1-14-34Z" fill="#E8DED1"/>
  ${star(40, 26, 1)}${star(96, 14, 0.7, '#B7C2AE')}${star(250, 20, 0.8)}${star(196, 40, 0.6, '#B7C2AE')}${star(150, 18, 0.5)}
  ${hills(340, 180, 0.72)}
  ${place(pupSVG(F.papa, { eyes: 'closed' }), 14, 30, 0.86)}
  ${place(pupSVG(F.mama, { eyes: 'closed', wave }), 232, 36, 0.82, true)}
  ${place(pupSVG(F.nube, { eyes: 'open', mouth: 'open', wave }), 106, 78, 0.58)}
  ${place(pupSVG(F.canela, { eyes: 'closed', mouth: 'open' }), 168, 84, 0.54, true)}
  ${heart(168, 72, 1)}`);

/** ÁLBUM / NIA: Canela y Nube con globos. */
export const balloonScene = () => scene('0 0 340 160', 'Ilustración: Nube y Canela con globos', `
  ${cloud(140, 6, 0.7)}
  ${hills(340, 160, 0.74)}
  ${balloon(70, 40, '1', '#EDCDBF')}${balloon(274, 34, '♥', '#B8D7E8')}
  ${place(pupSVG(F.nube, { eyes: 'open', mouth: 'open' }), 96, 38, 0.7)}
  ${place(pupSVG(F.canela, { eyes: 'open', mouth: 'open', wave: true }), 160, 44, 0.66, true)}
  ${flower(36, 138, 1)}${flower(306, 134, 1, '#B8D7E8')}${star(224, 70, 0.8)}`);

/** MEDICINA: Nube con estetoscopio y Canela con su maletín de médico. */
const stethoscope = `<path d="M44 100c-2 10 0 22 8 26M76 100c2 10 0 22-8 26" stroke="#5E6F7A" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M52 126q8 6 16 0" stroke="#5E6F7A" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <circle cx="60" cy="134" r="5.5" fill="#B8D7E8" stroke="#5E6F7A" stroke-width="2"/>`;
const doctorBag = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-10-14q0-7 10-7t10 7" stroke="#8A7B70" stroke-width="3" fill="none"/><rect x="-20" y="-14" width="40" height="28" rx="7" fill="#D7A18C"/><rect x="-20" y="-14" width="40" height="8" rx="4" fill="#C98F79"/><path d="M0-3v12M-6 3h12" stroke="#FFFDF9" stroke-width="3.4" stroke-linecap="round"/></g>`;
export const medicalScene = () => scene('0 0 340 160', 'Ilustración: Nube con un estetoscopio y Canela con su maletín de médico', `
  ${cloud(236, 10, 0.75)}${cloud(30, 18, 0.55)}
  ${hills(340, 160, 0.74)}
  ${flower(40, 136, 1, '#B8D7E8')}${flower(306, 130, 1)}
  ${place(pupSVG(F.nube, { eyes: 'open', mouth: 'smile' }) + stethoscope, 92, 30, 0.74)}
  ${place(pupSVG(F.canela, { eyes: 'closed', mouth: 'open' }), 168, 38, 0.68, true)}
  ${doctorBag(262, 132, 1.1)}
  ${heart(84, 50, 1.1)}${star(250, 60, 0.8)}${star(70, 96, 0.6, '#B7C2AE')}`);

/** Estados vacíos: Nube duerme sobre su cojín. */
export const sleepingScene = (size = 140) => `<svg width="${size}" height="${Math.round(size * 0.66)}" viewBox="0 0 210 138" aria-hidden="true">
  <path d="M178 14a20 20 0 1 0 16 30 16 16 0 1 1-16-30Z" fill="#E8DED1"/>
  ${star(30, 18, 0.9)}${star(146, 12, 0.6, '#B7C2AE')}
  <text x="120" y="34" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="18" fill="#8EAFC0">z</text>
  <text x="132" y="20" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="13" fill="#8EAFC0">z</text>
  <g transform="translate(4 16)">${sleepingPupSVG(F.nube)}</g>
</svg>`;

/** Caniche pequeño de cuerpo entero para tarjetas y formularios. */
export const pupIcon = (who = 'nube', size = 44, eyes = 'open') =>
  `<svg width="${size}" height="${size}" viewBox="0 8 120 162" aria-hidden="true">${pupSVG(F[who], { eyes, mouth: 'open' })}</svg>`;

/** Marco con la foto del bebé y los dos cachorros sentados a los lados. */
export const photoFrame = (src, alt) => `
  <div class="photo-frame">
    <img src="${src}" alt="${alt}">
    <svg class="photo-pup left" viewBox="0 8 120 162" aria-hidden="true">${pupSVG(F.nube, { eyes: 'open', mouth: 'open', wave: true })}</svg>
    <svg class="photo-pup right" viewBox="0 8 120 162" aria-hidden="true"><g transform="scale(-1 1) translate(-120 0)">${pupSVG(F.canela, { eyes: 'closed', mouth: 'open' })}</g></svg>
    <svg class="photo-deco" viewBox="0 0 100 30" aria-hidden="true">${heart(20, 14, 1.2)}${star(50, 12, 1)}${heart(80, 14, 1.2, '#B8D7E8')}</svg>
  </div>`;

/** Icono de la app: Nube y Canela sentados juntos. */
export const appIcon = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#F7F3ED"/>
  <circle cx="256" cy="250" r="196" fill="#E8DED1" opacity=".75"/>
  <path d="M0 410Q256 330 512 410V512H0Z" fill="#B7C2AE" opacity=".6"/>
  <g transform="translate(250 92) scale(2.15) scale(-1 1) translate(-120 0)">${pupSVG(F.canela, { eyes: 'closed', mouth: 'open' })}</g>
  <g transform="translate(36 70) scale(2.35)">${pupSVG(F.nube, { eyes: 'open', mouth: 'open' })}</g>
  ${star(430, 100, 3)}${star(84, 96, 2, '#93A28B')}
</svg>`;
