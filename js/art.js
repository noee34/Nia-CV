// Iconografía e ilustraciones originales de Nia CV (SVG en línea).
// El cachorro "Nube" es un diseño propio: no reproduce ningún personaje existente.

const C = {
  blue: '#B8D7E8', blueDeep: '#8EAFC0', cream: '#FFFDF9', ivory: '#F7F3ED',
  sand: '#E8DED1', sage: '#B7C2AE', taupe: '#8A7B70', terra: '#D7A18C', ink: '#5E544D',
};

const svg = (body, { size = 22, vb = '0 0 24 24', cls = 'icon', label } = {}) =>
  `<svg class="${cls}" width="${size}" height="${size}" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${body}</svg>`;

export const icons = {
  home: (o) => svg('<path d="M4 10.5 12 4l8 6.5"/><path d="M6 9.5V19a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1V9.5"/>', o),
  bottle: (o) => svg('<path d="M10 2.8h4"/><path d="M10.4 2.8v2.4l-1.6 1.6h6.4l-1.6-1.6V2.8"/><rect x="7.5" y="6.8" width="9" height="14.4" rx="3"/><path d="M7.5 11h3M7.5 14h2M7.5 17h3"/>', o),
  diaper: (o) => svg('<path d="M3.5 7h17v3.2c0 5.2-3.8 8.8-8.5 8.8S3.5 15.4 3.5 10.2Z"/><path d="M3.5 10c2.6 0 4.4 1.6 5.2 4.2M20.5 10c-2.6 0-4.4 1.6-5.2 4.2"/><path d="M10.6 10.2l1.4.9 1.4-.9"/>', o),
  calendar: (o) => svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v3.5M16 3v3.5"/><circle cx="12" cy="14.5" r="1" fill="currentColor" stroke="none"/>', o),
  plus: (o) => svg('<path d="M12 5v14M5 12h14"/>', o),
  minus: (o) => svg('<path d="M5 12h14"/>', o),
  gear: (o) => svg('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>', o),
  left: (o) => svg('<path d="M14.5 6 8.5 12l6 6"/>', o),
  right: (o) => svg('<path d="M9.5 6l6 6-6 6"/>', o),
  close: (o) => svg('<path d="M6 6l12 12M18 6 6 18"/>', o),
  check: (o) => svg('<path d="M5 12.5 10 17.5 19 7"/>', o),
  trash: (o) => svg('<path d="M4.5 7h15M10 4h4M6.5 7l.9 12a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12"/>', o),
  pencil: (o) => svg('<path d="M15.5 4.5l4 4L9 19H5v-4Z"/>', o),
  download: (o) => svg('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>', o),
  upload: (o) => svg('<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>', o),
  shield: (o) => svg('<path d="M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6Z"/><path d="M9 12l2 2 4-4"/>', o),
  note: (o) => svg('<path d="M5 4.5h14v15H5z"/><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4"/>', o),
  clock: (o) => svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', o),
  star: (o) => svg('<path d="M12 3.5l2.4 5 5.4.6-4 3.7 1.1 5.4L12 15.5l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6Z"/>', o),
  heart: (o) => svg('<path d="M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.1c0 5.1-7 9.4-7 9.4Z"/>', o),
  sun: (o) => svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2M12 19.2v2M21.2 12h-2M4.8 12h-2M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4M18.5 18.5l-1.4-1.4M6.9 6.9 5.5 5.5"/>', o),
  moon: (o) => svg('<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>', o),
  chart: (o) => svg('<path d="M4 20h16"/><rect x="5.5" y="11" width="3" height="6" rx="1"/><rect x="10.5" y="6" width="3" height="11" rx="1"/><rect x="15.5" y="9" width="3" height="8" rx="1"/>', o),
};

/** Iconos de consistencia: diferencian por forma, no sólo por color. */
export const consistencyIcon = {
  liquida: (s = 34) => `<svg width="${s}" height="${s}" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M20 7c4 6 8 10.5 8 15.5a8 8 0 0 1-16 0C12 17.5 16 13 20 7Z" fill="${C.blue}" opacity=".55"/>
    <path d="M9 31c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" stroke="${C.blueDeep}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <circle cx="30" cy="12" r="2" fill="${C.blue}"/></svg>`,
  blanda: (s = 34) => `<svg width="${s}" height="${s}" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M20 6c4.5 7 9 11.5 9 17a9 9 0 0 1-18 0c0-5.5 4.5-10 9-17Z" fill="${C.terra}" opacity=".5"/>
    <path d="M16 24a4.5 4.5 0 0 0 4 4" stroke="${C.cream}" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  normal: (s = 34) => `<svg width="${s}" height="${s}" viewBox="0 0 40 40" aria-hidden="true">
    <ellipse cx="20" cy="22" rx="12" ry="9.5" fill="${C.taupe}" opacity=".45"/>
    <path d="M13.5 20a7 5 0 0 1 6-3.5" stroke="${C.cream}" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  dura: (s = 34) => `<svg width="${s}" height="${s}" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="15" cy="24" r="6" fill="${C.taupe}" opacity=".7"/>
    <circle cx="25.5" cy="21" r="5" fill="${C.taupe}" opacity=".55"/>
    <circle cx="21" cy="29.5" r="3.6" fill="${C.taupe}" opacity=".4"/></svg>`,
};

export const smallStar = (size = 10, color = C.terra) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 0l1.2 3.6L10 5 6.2 6.2 5 10 3.8 6.2 0 5l3.8-1.4Z" fill="${color}"/></svg>`;

export const paw = (size = 14, color = C.sage) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true" fill="${color}"><ellipse cx="10" cy="13.5" rx="4.6" ry="3.8"/><circle cx="4.2" cy="8.6" r="2"/><circle cx="8" cy="5.2" r="2"/><circle cx="12.2" cy="5.2" r="2"/><circle cx="15.9" cy="8.6" r="2"/></svg>`;

/** Logotipo tipográfico: "Nia" en serif cursiva + "CV" en versalitas, con una estrellita. */
export const logo = (cls = '') =>
  `<span class="logo ${cls}" aria-label="Nia CV" role="img"><span class="logo-nia">Nia</span><span class="logo-star">${smallStar(9)}</span><span class="logo-cv">CV</span></span>`;

/** Cabeza del cachorro Nube (ojos cerrados y sonrisa tranquila). */
function puppyHead({ x = 0, y = 0, s = 1, sleepy = true } = {}) {
  const eyes = sleepy
    ? `<path d="M44 61q5-4.5 10 0M66 61q5-4.5 10 0" stroke="${C.ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
    : `<circle cx="49" cy="60" r="3.2" fill="${C.ink}"/><circle cx="71" cy="60" r="3.2" fill="${C.ink}"/><circle cx="50" cy="59" r="1" fill="#fff"/><circle cx="72" cy="59" r="1" fill="#fff"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M36 50C27 40 21 26 23.5 15.5c.8-3.4 4-4.4 6.6-2.2C38 20 47 29 53 38Z" fill="${C.blueDeep}"/>
    <path d="M84 50c9-10 15-24 12.5-34.5-.8-3.4-4-4.4-6.6-2.2C82 20 73 29 67 38Z" fill="${C.blueDeep}"/>
    <path d="M39 42.5c-3-5-4.6-10.6-4.4-15 3.4 3 6.8 6.6 9.6 10.2Z" fill="${C.sand}" opacity=".85"/>
    <path d="M81 42.5c3-5 4.6-10.6 4.4-15-3.4 3-6.8 6.6-9.6 10.2Z" fill="${C.sand}" opacity=".85"/>
    <ellipse cx="60" cy="62" rx="35" ry="30" fill="${C.blue}"/>
    <ellipse cx="72.5" cy="58.5" rx="10.5" ry="9.5" fill="${C.blueDeep}" opacity=".55"/>
    <path d="M60 34c-3 3-4 8.5-2.4 13 .8 2 4 2 4.8 0C64 42.5 63 37 60 34Z" fill="${C.blueDeep}" opacity=".75"/>
    <ellipse cx="60" cy="76" rx="20" ry="14" fill="${C.cream}"/>
    ${eyes}
    <path d="M53.5 68.2c4.2-2.4 8.8-2.4 13 0 .9.6.8 1.9-.1 2.6L61.4 74a2.4 2.4 0 0 1-2.8 0l-5-3.2c-.9-.7-1-2-.1-2.6Z" fill="#6F625A"/>
    <path d="M60 74.5q-3.6 4.4-7.6 1.8M60 74.5q3.6 4.4 7.6 1.8" stroke="#6F625A" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M57 77.6q3 6.6 6 0" fill="#E2A28E"/>
    <ellipse cx="39" cy="73" rx="5" ry="3.6" fill="#EDB9A6" opacity=".75"/>
    <ellipse cx="81" cy="73" rx="5" ry="3.6" fill="#EDB9A6" opacity=".75"/>
  </g>`;
}

const cloud = (x, y, s = 1, fill = C.cream) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M10 40a14 14 0 0 1 4-27.4A20 20 0 0 1 52 8a16 16 0 0 1 26 12 12 12 0 0 1-2 20Z" fill="${fill}"/>`;

/** Cabecera: Nube asomándose tras una nube, con estrellas. */
export const heroIllustration = () => `
<svg class="hero-art" viewBox="0 0 220 120" role="img" aria-label="Ilustración: un cachorro azul se asoma tras una nube">
  <circle cx="150" cy="58" r="50" fill="${C.sand}" opacity=".55"/>
  <g opacity=".9">${smallStarPath(36, 26, 1.1)}${smallStarPath(196, 18, .8)}${smallStarPath(204, 78, .6)}${smallStarPath(22, 70, .55, C.sage)}</g>
  ${puppyHead({ x: 98, y: 4, s: .86 })}
  ${cloud(70, 74, 1.55)}
  ${cloud(146, 86, .9, C.ivory)}
</svg>`;

function smallStarPath(x, y, s = 1, color = C.terra) {
  return `<path transform="translate(${x} ${y}) scale(${s})" d="M0-7 1.7-1.7 7 0 1.7 1.7 0 7-1.7 1.7-7 0-1.7-1.7Z" fill="${color}"/>`;
}

/** Estados vacíos: Nube dormido sobre una luna creciente. */
export const sleepyIllustration = (size = 120) => `
<svg width="${size}" height="${size * .72}" viewBox="0 0 170 122" aria-hidden="true">
  <path d="M140 18a34 34 0 1 0 22 50 28 28 0 1 1-22-50Z" fill="${C.sand}"/>
  ${smallStarPath(20, 20, .9)}${smallStarPath(160, 100, .6, C.sage)}${smallStarPath(36, 96, .5)}
  ${puppyHead({ x: 28, y: 6, s: .78 })}
  <text x="120" y="40" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="16" fill="${C.blueDeep}">z</text>
  <text x="130" y="28" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="12" fill="${C.blueDeep}">z</text>
  ${cloud(18, 80, 1.7)}
</svg>`;

/** Mini escena para la cabecera del biberón y las cacas. */
export const miniPuppy = (size = 46) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 120 110" aria-hidden="true">${puppyHead({ sleepy: false })}</svg>`;

/** Icono de app (también usado para generar los PNG). */
export const appIconSVG = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${C.ivory}"/>
  <circle cx="256" cy="262" r="176" fill="${C.sand}" opacity=".6"/>
  <g transform="translate(70 70) scale(3.1)">${puppyHead({})}</g>
  <g transform="translate(400 120) scale(3)">${smallStarPath(0, 0, 1)}</g>
  <g transform="translate(112 404) scale(2)">${smallStarPath(0, 0, 1, C.sage)}</g>
</svg>`;
