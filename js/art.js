// Iconografía e ilustraciones originales de Nia CV (SVG en línea).
// Los personajes (Nube, Canela, Mamá y Papá) están en characters.js.

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
  whatsapp: (o) => svg('<path d="M4.5 19.5l1.2-4A8 8 0 1 1 8.6 18.3Z"/><path d="M9.2 8.6c.3-.6.9-.6 1.2 0l.6 1.3c.1.3 0 .6-.2.8l-.5.5c.6 1.2 1.5 2.1 2.7 2.7l.5-.5c.2-.2.5-.3.8-.2l1.3.6c.6.3.6.9 0 1.2-1.6 1-5.2-.6-6.7-3.6-.6-1.2-.6-2.2.3-2.8Z"/>', o),
  medical: (o) => svg('<rect x="3.5" y="5.5" width="17" height="14" rx="3.5"/><path d="M9 5.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5M12 9.5v6M9 12.5h6"/>', o),
  bell: (o) => svg('<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2H5Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>', o),
  syringe: (o) => svg('<path d="m17 3 4 4M15 5l4 4M7.5 12.5l4 4M5 19l2.5-2.5M16.5 7.5 8 16l-2-2 8.5-8.5Z"/>', o),
  stetho: (o) => svg('<path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 12v2.5a4.5 4.5 0 0 0 9 0V13"/><circle cx="19" cy="11" r="2"/>', o),
  pill: (o) => svg('<rect x="3.2" y="8.5" width="17.6" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m9.2 8.2 5.6 7.6"/>', o),
  clipboard: (o) => svg('<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 4.5V3.5h6v1M8.5 10h7M8.5 13.5h7M8.5 17h4"/>', o),
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
