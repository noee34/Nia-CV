// La familia de Nia CV: personajes y escenas ORIGINALES dibujados en SVG.
//   · Nube   — cachorro azul pastel, orejitas cortas dobladas hacia delante y huellita en el pecho
//   · Canela — cachorrita melocotón, orejas largas caídas y lazo azul
//   · Mamá   — color avena, orejas caídas y una flor
//   · Papá   — verde salvia, orejas redondas y bufanda
// Son diseños propios: no reproducen personajes de ninguna serie.

const INK = '#5E544D';
const NOSE = '#6F625A';
const CREAM = '#FFFDF9';
const BLUSH = '#EDB9A6';

export const FAMILY = {
  nube: { name: 'Nube', fur: '#B8D7E8', dark: '#8EAFC0', inner: '#E3EEF4', ears: 'fold', chest: true },
  canela: { name: 'Canela', fur: '#F2C9A8', dark: '#D7A18C', inner: '#F8E4D5', ears: 'long', bow: '#8EAFC0' },
  mama: { name: 'Mamá', fur: '#E6D9C7', dark: '#BBA78F', inner: '#F4ECE1', ears: 'long', flower: '#D7A18C' },
  papa: { name: 'Papá', fur: '#B9C6B3', dark: '#8F9E89', inner: '#E2E8DE', ears: 'round', scarf: '#D7A18C' },
};

/* ------------------------------------------------------------------ */
/* Piezas                                                              */
/* ------------------------------------------------------------------ */

function ears(c, layer) {
  if (c.ears === 'fold') {
    // Orejitas cortas con la punta doblada hacia delante (Nube)
    if (layer === 'back') {
      return `<path d="M27 50c-3-12-1-24 6-31 3-3 8-2 10 1l13 17Z" fill="${c.dark}"/>
        <path d="M93 50c3-12 1-24-6-31-3-3-8-2-10 1L64 37Z" fill="${c.dark}"/>
        <path d="M33 44c-1-7 0-14 3-18l9 12Z" fill="${c.inner}"/><path d="M87 44c1-7 0-14-3-18l-9 12Z" fill="${c.inner}"/>`;
    }
    return `<path d="M33 19c3-3 8-2 10 1l5 8c-6 5-14 7-20 5-2-5 0-10 5-14Z" fill="#7FA0B2"/>
      <path d="M87 19c-3-3-8-2-10 1l-5 8c6 5 14 7 20 5 2-5 0-10-5-14Z" fill="#7FA0B2"/>`;
  }
  if (c.ears === 'round') {
    if (layer !== 'back') return '';
    return `<circle cx="32" cy="38" r="15" fill="${c.dark}"/><circle cx="88" cy="38" r="15" fill="${c.dark}"/>
      <circle cx="33" cy="39" r="8" fill="${c.inner}"/><circle cx="87" cy="39" r="8" fill="${c.inner}"/>`;
  }
  // Orejas largas caídas: delante, a los lados de la cara
  if (layer !== 'front') return '';
  if (c.ears !== 'long') return '';
  return `<path d="M34 40C21 39 11 53 12 72c1 13 10 20 18 15 6-4 8-20 10-34Z" fill="${c.dark}"/>
    <path d="M86 40c13-1 23 13 22 32-1 13-10 20-18 15-6-4-8-20-10-34Z" fill="${c.dark}"/>`;
}

function face(c, eyes = 'closed', mouth = 'smile') {
  const e = eyes === 'open'
    ? `<circle cx="48" cy="61" r="3.6" fill="${INK}"/><circle cx="72" cy="61" r="3.6" fill="${INK}"/>
       <circle cx="49.3" cy="59.6" r="1.2" fill="#fff"/><circle cx="73.3" cy="59.6" r="1.2" fill="#fff"/>`
    : eyes === 'sleep'
      ? `<path d="M43 62q5 3.5 10 0M67 62q5 3.5 10 0" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
      : `<path d="M43 62q5-4.5 10 0M67 62q5-4.5 10 0" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  const m = mouth === 'open'
    ? `<path d="M53 76.5q7 9 14 0Z" fill="#B76E5E"/><path d="M56.5 79.5q3.5 3.5 7 0" fill="#E2A28E"/>`
    : `<path d="M60 75q-3.6 4.4-7.6 1.8M60 75q3.6 4.4 7.6 1.8" stroke="${NOSE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  return `<ellipse cx="60" cy="77" rx="19" ry="13" fill="${CREAM}"/>
    ${e}
    <ellipse cx="60" cy="70.5" rx="5.6" ry="4.1" fill="${NOSE}"/>
    <ellipse cx="58.4" cy="69.3" rx="1.6" ry=".9" fill="#fff" opacity=".5"/>
    ${m}
    <ellipse cx="38.5" cy="73" rx="5" ry="3.4" fill="${BLUSH}" opacity=".8"/>
    <ellipse cx="81.5" cy="73" rx="5" ry="3.4" fill="${BLUSH}" opacity=".8"/>`;
}

function accessories(c) {
  let out = '';
  if (c.bow) {
    out += `<g transform="translate(40 34) rotate(-18)"><path d="M0 0-11-7v14Z" fill="${c.bow}"/><path d="M0 0 11-7v14Z" fill="${c.bow}"/><circle r="3.4" fill="${c.bow}"/><circle r="1.6" fill="#fff" opacity=".6"/></g>`;
  }
  if (c.flower) {
    out += `<g transform="translate(83 33)">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(6 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(6 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="4" fill="${c.flower}"/>`).join('')}<circle r="3" fill="#F4E3B5"/></g>`;
  }
  return out;
}

/** Solo la cabeza (caja 120×100). */
export function headSVG(c, { eyes = 'closed', mouth = 'smile' } = {}) {
  return `${ears(c, 'back')}
    <ellipse cx="60" cy="62" rx="35" ry="30" fill="${c.fur}"/>
    <ellipse cx="60" cy="40" rx="16" ry="6" fill="#fff" opacity=".18"/>
    ${ears(c, 'front')}
    ${face(c, eyes, mouth)}
    ${accessories(c)}`;
}

/** Perrito sentado entero (caja 120×165). `hold` dibuja algo entre las patas. */
export function pupSVG(c, { eyes = 'closed', mouth = 'smile', hold = '', diaper = false, wave = false } = {}) {
  const chest = c.chest
    ? `<g transform="translate(60 120) scale(.42)" fill="${c.dark}" opacity=".55"><ellipse cy="6" rx="9" ry="7.5"/><circle cx="-11" cy="-5" r="4"/><circle cx="-4" cy="-11" r="4"/><circle cx="4" cy="-11" r="4"/><circle cx="11" cy="-5" r="4"/></g>`
    : '';
  const scarf = c.scarf
    ? `<path d="M34 96q26 12 52 0l-2 9q-24 10-48 0Z" fill="${c.scarf}"/><path d="M74 101l6 18-9 1-3-17Z" fill="${c.scarf}"/>`
    : '';
  const diaperShape = diaper
    ? `<path d="M31 132h58c0 18-12 29-29 29s-29-11-29-29Z" fill="${CREAM}" stroke="${c.dark}" stroke-width="1.2" opacity=".97"/><circle cx="38" cy="138" r="3" fill="${'#B8D7E8'}"/><circle cx="82" cy="138" r="3" fill="${'#B8D7E8'}"/>`
    : '';
  const arm = wave
    ? `<path d="M86 112c10-6 16-18 17-30" stroke="${c.fur}" stroke-width="13" stroke-linecap="round" fill="none"/><circle cx="103" cy="80" r="7.5" fill="${c.fur}"/>`
    : '';
  return `<path d="M86 136c15-2 22-16 19-30" stroke="${c.dark}" stroke-width="10" stroke-linecap="round" fill="none"/>
    <ellipse cx="60" cy="128" rx="31" ry="30" fill="${c.fur}"/>
    <ellipse cx="60" cy="133" rx="18" ry="19" fill="${CREAM}" opacity=".9"/>
    ${chest}
    <ellipse cx="34" cy="152" rx="13" ry="8.5" fill="${c.fur}"/>
    <ellipse cx="86" cy="152" rx="13" ry="8.5" fill="${c.fur}"/>
    ${diaperShape}
    ${hold}
    <ellipse cx="${hold ? 43 : 48}" cy="${hold ? 128 : 155}" rx="8.5" ry="6.5" fill="${c.fur}" stroke="${c.dark}" stroke-width="1.2"/>
    <ellipse cx="${hold ? 77 : 72}" cy="${hold ? 128 : 155}" rx="8.5" ry="6.5" fill="${c.fur}" stroke="${c.dark}" stroke-width="1.2"/>
    ${arm}
    ${scarf}
    <g>${headSVG(c, { eyes, mouth })}</g>`;
}

/* ------------------------------------------------------------------ */
/* Decoración                                                          */
/* ------------------------------------------------------------------ */

const star = (x, y, s = 1, color = '#D7A18C') =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0-7 1.7-1.7 7 0 1.7 1.7 0 7-1.7 1.7-7 0-1.7-1.7Z" fill="${color}"/>`;
const cloud = (x, y, s = 1, fill = CREAM) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M10 40a14 14 0 0 1 4-27.4A20 20 0 0 1 52 8a16 16 0 0 1 26 12 12 12 0 0 1-2 20Z" fill="${fill}"/>`;
const flower = (x, y, s = 1, petal = '#EDCDBF') =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0v12" stroke="#93A28B" stroke-width="1.6"/>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(4 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(4 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="3.2" fill="${petal}"/>`).join('')}<circle r="2.2" fill="#F4E3B5"/></g>`;
const ball = (x, y, r = 12) =>
  `<g transform="translate(${x} ${y})"><circle r="${r}" fill="#FFFDF9"/><path d="M${-r} 0a${r} ${r} 0 0 0 ${2 * r} 0" fill="#B8D7E8"/><path d="M${-r * 0.35} ${-r * 0.94}q${r * 0.7} ${r} 0 ${r * 1.88}" stroke="#D7A18C" stroke-width="2.4" fill="none"/><circle r="${r}" fill="none" stroke="#8A7B70" stroke-opacity=".25"/></g>`;
const sun = (x, y, r = 17) =>
  `<g transform="translate(${x} ${y})">${Array.from({ length: 8 }, (_, i) => `<path d="M0 ${-r - 5}v-6" stroke="#EBCB8B" stroke-width="3" stroke-linecap="round" transform="rotate(${i * 45})"/>`).join('')}<circle r="${r}" fill="#F4DFA6"/><path d="M-7-1q3-3 6 0M2-1q3-3 6 0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round" transform="translate(-.5 0)"/><path d="M-4 5q4 4 8 0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="-10" cy="5" r="2.6" fill="${BLUSH}"/><circle cx="10" cy="5" r="2.6" fill="${BLUSH}"/></g>`;
const butterfly = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s}) rotate(-12)"><ellipse cx="-6" cy="-4" rx="7" ry="6" fill="#B8D7E8"/><ellipse cx="6" cy="-4" rx="7" ry="6" fill="#B8D7E8"/><ellipse cx="-5" cy="5" rx="5" ry="4" fill="#EDCDBF"/><ellipse cx="5" cy="5" rx="5" ry="4" fill="#EDCDBF"/><rect x="-1.2" y="-8" width="2.4" height="17" rx="1.2" fill="${INK}"/><path d="M0-8q-3-6-6-7M0-8q3-6 6-7" stroke="${INK}" stroke-width="1" fill="none"/></g>`;
const heart = (x, y, s = 1, color = '#EDB9A6') =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6S-8 1-8-4a4.4 4.4 0 0 1 8-2.4A4.4 4.4 0 0 1 8-4c0 5-8 10-8 10Z" fill="${color}"/>`;
const pawPrint = (x, y, s = 1, color = '#B7C2AE', rot = 0) =>
  `<g transform="translate(${x} ${y}) scale(${s}) rotate(${rot})" fill="${color}"><ellipse cy="4" rx="5" ry="4.2"/><circle cx="-6" cy="-3" r="2.2"/><circle cx="-2" cy="-7" r="2.2"/><circle cx="2" cy="-7" r="2.2"/><circle cx="6" cy="-3" r="2.2"/></g>`;
const kite = (x, y) =>
  `<g transform="translate(${x} ${y}) rotate(14)"><path d="M0-18 13 0 0 22-13 0Z" fill="#EDCDBF"/><path d="M0-18 13 0H-13Z" fill="#D7A18C" opacity=".55"/><path d="M0-18V22M-13 0h26" stroke="${CREAM}" stroke-width="1.2"/><path d="M0 22q-6 10 2 16t-2 18" stroke="${INK}" stroke-width="1" fill="none" opacity=".6"/>${[30, 42].map((d) => `<path d="M${d % 2 ? -3 : 0} ${d}l5 2-5 2Z" fill="#B8D7E8"/>`).join('')}</g>`;
const bottle = (x, y, s = 1, rot = 0) =>
  `<g transform="translate(${x} ${y}) scale(${s}) rotate(${rot})"><rect x="-9" y="-8" width="18" height="30" rx="6" fill="#FFFDF9" stroke="#8EAFC0" stroke-width="1.6"/><rect x="-9" y="6" width="18" height="16" rx="5" fill="#F8F1E4"/><path d="M-9 0h5M-9 6h4M-9 12h5" stroke="#8EAFC0" stroke-width="1.2"/><rect x="-7" y="-14" width="14" height="7" rx="2" fill="#B8D7E8"/><path d="M-4-14q4-10 8 0Z" fill="#EDCDBF"/></g>`;
const hills = (w, h, top = 0.68) => `
  <path d="M0 ${h * top} Q${w * 0.25} ${h * (top - 0.14)} ${w * 0.52} ${h * (top - 0.02)} T${w} ${h * (top - 0.06)} V${h} H0Z" fill="#D3DBCB"/>
  <path d="M0 ${h * (top + 0.14)} Q${w * 0.35} ${h * (top + 0.02)} ${w * 0.62} ${h * (top + 0.12)} T${w} ${h * (top + 0.1)} V${h} H0Z" fill="#B7C2AE"/>`;

const place = (svg, x, y, s, flip = false) =>
  `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})${flip ? ' translate(-120 0)' : ''}">${svg}</g>`;

/* ------------------------------------------------------------------ */
/* Escenas                                                             */
/* ------------------------------------------------------------------ */

const F = FAMILY;
const scene = (vb, label, body) =>
  `<svg class="scene" viewBox="${vb}" role="img" aria-label="${label}" preserveAspectRatio="xMidYMax meet">${body}</svg>`;

/** HOY: Nube y Canela juegan en el jardín con una pelota y una cometa. */
export const gardenScene = () => scene('0 0 340 170', 'Ilustración: Nube y Canela juegan en el jardín', `
  ${sun(292, 36)}
  ${cloud(22, 14, 0.9)}${cloud(150, 6, 0.6, '#FFFDF9')}
  ${kite(222, 34)}
  ${hills(340, 170)}
  ${flower(26, 140, 1.1)}${flower(312, 128, 1, '#B8D7E8')}${flower(196, 150, 0.9)}
  ${pawPrint(150, 160, 0.7, '#9FAE98', -20)}${pawPrint(170, 152, 0.7, '#9FAE98', -10)}
  ${place(pupSVG(F.nube, { eyes: 'open', mouth: 'open', wave: true }), 52, 50, 0.72)}
  ${place(pupSVG(F.canela, { eyes: 'closed', mouth: 'open' }), 232, 62, 0.62, true)}
  ${ball(178, 136, 13)}
  ${heart(140, 60, 1.1)}${star(120, 34, 0.9)}${star(318, 88, 0.7, '#B7C2AE')}`);

/** BIBERONES: Nube abraza su biberón. */
export const bottleScene = () => scene('0 0 340 150', 'Ilustración: Nube con su biberón', `
  ${cloud(240, 8, 0.8)}${cloud(30, 24, 0.55)}
  ${hills(340, 150, 0.74)}
  ${flower(40, 126, 1)}${flower(300, 118, 1, '#B8D7E8')}
  ${place(pupSVG(F.nube, { eyes: 'closed', hold: bottle(60, 122, 1.55, -8) }), 118, 32, 0.7)}
  ${heart(232, 62, 1.2)}${heart(252, 44, 0.8, '#B8D7E8')}${star(96, 46, 0.9)}${star(268, 92, 0.7, '#B7C2AE')}`);

/** CACAS: Canela con su pañal y una mariposa. */
export const diaperScene = () => scene('0 0 340 150', 'Ilustración: Canela con su pañal y una mariposa', `
  ${sun(48, 34, 14)}${cloud(250, 12, 0.7)}
  ${hills(340, 150, 0.74)}
  ${flower(70, 128, 1.1, '#B8D7E8')}${flower(286, 124, 1)}${flower(306, 132, 0.8, '#B8D7E8')}
  ${place(pupSVG(F.canela, { eyes: 'open', mouth: 'open', diaper: true }), 118, 30, 0.7)}
  ${butterfly(236, 48, 1.1)}${pawPrint(92, 140, 0.6, '#9FAE98', 15)}`);

/** DIARIO: la familia, sentada en la colina bajo la luna y las estrellas. */
export const familyScene = ({ wave = false } = {}) => scene('0 0 340 170', 'Ilustración: la familia de Nube y Canela', `
  <path d="M300 22a20 20 0 1 0 14 34 16 16 0 1 1-14-34Z" fill="#E8DED1"/>
  ${star(40, 26, 1)}${star(96, 14, 0.7, '#B7C2AE')}${star(250, 20, 0.8)}${star(196, 40, 0.6, '#B7C2AE')}${star(150, 18, 0.5)}
  ${hills(340, 170, 0.72)}
  ${place(pupSVG(F.papa, { eyes: 'closed' }), 20, 34, 0.82)}
  ${place(pupSVG(F.mama, { eyes: 'closed', wave }), 230, 40, 0.78, true)}
  ${place(pupSVG(F.nube, { eyes: 'open', mouth: 'open', wave }), 110, 76, 0.56)}
  ${place(pupSVG(F.canela, { eyes: 'closed', mouth: 'open' }), 172, 82, 0.52, true)}
  ${heart(168, 70, 1)}`);

/** Estados vacíos: Nube duerme bajo su mantita. */
export const sleepingScene = (size = 140) => `<svg width="${size}" height="${Math.round(size * 0.68)}" viewBox="0 0 200 136" aria-hidden="true">
  <path d="M168 14a20 20 0 1 0 16 30 16 16 0 1 1-16-30Z" fill="#E8DED1"/>
  ${star(30, 22, 0.9)}${star(140, 14, 0.6, '#B7C2AE')}
  <text x="122" y="46" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="18" fill="#8EAFC0">z</text>
  <text x="134" y="32" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="13" fill="#8EAFC0">z</text>
  <rect x="14" y="98" width="172" height="26" rx="13" fill="#E8DED1"/>
  <ellipse cx="52" cy="92" rx="34" ry="13" fill="${CREAM}"/>
  <g transform="translate(14 32) scale(.62) rotate(-8 60 60)">${headSVG(F.nube, { eyes: 'sleep' })}</g>
  <path d="M70 84q50-16 110 4v24H70Z" fill="#B8D7E8"/>
  <path d="M70 84q50-16 110 4" stroke="#FFFDF9" stroke-width="2" stroke-dasharray="4 5" fill="none"/>
  ${[[96, 98], [124, 94], [152, 99], [110, 106], [140, 106]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#FFFDF9" opacity=".8"/>`).join('')}
</svg>`;

/** Cabeza pequeña para tarjetas y formularios. */
export const headIcon = (who = 'nube', size = 42, eyes = 'open') =>
  `<svg width="${size}" height="${size}" viewBox="6 6 108 96" aria-hidden="true">${headSVG(F[who], { eyes })}</svg>`;

/** Marco con la foto del bebé y los cachorros asomándose. */
export const photoFrame = (src, alt) => `
  <div class="photo-frame">
    <img src="${src}" alt="${alt}">
    <svg class="photo-pup left" viewBox="0 0 120 100" aria-hidden="true">${headSVG(F.nube, { eyes: 'open', mouth: 'open' })}</svg>
    <svg class="photo-pup right" viewBox="0 0 120 100" aria-hidden="true">${headSVG(F.canela, { eyes: 'closed', mouth: 'open' })}</svg>
    <svg class="photo-deco" viewBox="0 0 100 30" aria-hidden="true">${heart(20, 14, 1.2)}${star(50, 12, 1)}${heart(80, 14, 1.2, '#B8D7E8')}</svg>
  </div>`;

/** Icono de la app: Nube y Canela juntos. */
export const appIcon = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#F7F3ED"/>
  <circle cx="256" cy="270" r="190" fill="#E8DED1" opacity=".7"/>
  <path d="M0 392Q256 300 512 392V512H0Z" fill="#B7C2AE" opacity=".55"/>
  <g transform="translate(212 150) scale(2.15)">${headSVG(F.canela, { eyes: 'closed', mouth: 'open' })}</g>
  <g transform="translate(50 132) scale(2.45)">${headSVG(F.nube, { eyes: 'open', mouth: 'open' })}</g>
  ${star(420, 112, 3)}${star(96, 420, 2, '#93A28B')}${heart(406, 396, 3)}
</svg>`;
