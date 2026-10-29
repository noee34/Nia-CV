// Foto de cabecera: se reduce en el propio dispositivo antes de guardarla,
// para que ocupe poco (unos 50–80 KB) y se sincronice rápido entre dispositivos.

const MAX_SIDE = 720;       // píxeles del lado mayor
const MAX_CHARS = 350_000;  // tamaño máximo del texto de la imagen (~260 KB)

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se ha podido abrir esa imagen. Prueba con otra foto.')); };
    img.src = url;
  });
}

/** Convierte un archivo de imagen en una foto JPEG reducida (data URL). */
export async function photoFromFile(file) {
  if (!file || !/^image\//.test(file.type || 'image/')) throw new Error('Elige un archivo de imagen.');
  const img = await loadImage(file);
  let side = MAX_SIDE;
  for (let quality = 0.82; ; quality -= 0.12, side = Math.round(side * 0.8)) {
    const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFDF9'; // fondo para imágenes con transparencia
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const data = canvas.toDataURL('image/jpeg', Math.max(quality, 0.5));
    if (data.length <= MAX_CHARS || quality < 0.5) return data;
  }
}
