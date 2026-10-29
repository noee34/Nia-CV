// Pestaña Nia: foto, datos personales y álbum mes a mes; y escenas de la familia.
// Requiere el servidor en marcha (npm start).
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const URL = process.env.APP_URL || 'http://localhost:5173/';
const shots = process.argv[2] || 'docs/screenshots';
const step = (m) => console.log('✓', m);

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES', timezoneId: 'Europe/Madrid', serviceWorkers: 'block' });
await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const SUPABASE_URL = ''; export const SUPABASE_ANON_KEY = '';" }));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const closeSheet = async () => { await page.getByRole('button', { name: 'Cerrar' }).first().tap(); await page.locator('.sheet-root').waitFor({ state: 'detached' }); };
const sheetGone = () => page.locator('.sheet-root').waitFor({ state: 'detached' });
const toastSays = (t) => page.locator('.toast').filter({ hasText: t }).waitFor();

await page.goto(URL);
await page.locator('.h-display').waitFor();
assert.equal(await page.locator('#view-hoy .scene-banner svg.scene').count(), 1);
assert.equal(await page.locator('#view-hoy .card-badge.pup svg').count(), 2);
step('Hoy: escena del jardín y caniches de cuerpo entero en las tarjetas');
for (const [tab, view] of [['Biberones', 'biberones'], ['Cacas', 'cacas'], ['Diario', 'diario']]) {
  await page.getByRole('tab', { name: tab }).tap();
  await page.locator(`#view-${view} .scene-banner svg.scene`).waitFor({ timeout: 5000 });
}
step('Biberones, Cacas y Diario tienen su escena');

// ---------- Pestaña Nia
await page.getByRole('tab', { name: 'Nia' }).tap();
await page.locator('#view-nia .album-grid').waitFor();
assert.equal(await page.locator('#view-nia .album-tile').count(), 13);
assert.match(await page.locator('#view-nia').innerText(), /Añade la fecha de nacimiento/);
step('Pestaña Nia: 13 huecos de álbum (nacimiento + 12 meses)');

// Datos personales
await page.getByRole('button', { name: 'Editar datos de Nia' }).tap();
await page.fill('input[name="birth"]', '2026-07-24');
await page.getByRole('radio', { name: 'A+' }).tap();
await page.fill('input[name="height"]', '200');
await page.getByRole('button', { name: 'Guardar datos' }).tap();
assert.match(await page.locator('.sheet .form-error').innerText(), /entre 30 y 130/);
await page.fill('input[name="height"]', '58,5');
await page.screenshot({ path: `${shots}/nia-datos.png` });
await page.getByRole('button', { name: 'Guardar datos' }).tap();
await sheetGone();
const datos = await page.locator('#view-nia .data-list').innerText();
assert.match(datos, /24 de julio de 2026/);
assert.match(datos, /3 meses y 5 días/);
assert.match(datos, /A\+/);
assert.match(datos, /58,5 cm/);
step('Datos personales: nacimiento, edad calculada (3 meses y 5 días), grupo A+ y talla 58,5 cm (rechaza 200 cm)');

const tiles = await page.locator('#view-nia .album-tile').allInnerTexts();
assert.match(tiles[3], /3 meses[\s\S]*Este mes/);
assert.match(tiles[0], /Nacimiento[\s\S]*24 jul/);
assert.match(tiles[12], /1 año[\s\S]*Llega el 24 jul/);
step('Álbum: fechas de cada mes, el actual marcado y los futuros con su fecha');

// Foto de cabecera
await page.locator('input[name="header-photo"]').setInputFiles('icons/icon-512.png');
await toastSays('Foto guardada');
await page.locator('#view-nia .photo-frame img').waitFor();
await page.getByRole('tab', { name: 'Hoy' }).tap();
await page.locator('#view-hoy .photo-frame img').waitFor();
assert.match(await page.locator('#view-hoy .date-line').innerText(), /3 meses y 5 días/);
await page.screenshot({ path: `${shots}/foto-hoy.png` });
step('Foto elegida en Nia aparece también en Hoy, con la edad junto a la fecha');

// Álbum: guardar un mes con foto y nota
await page.getByRole('tab', { name: 'Nia' }).tap();
await page.locator('[data-album="1"]').tap();
await page.getByRole('button', { name: 'Guardar en el álbum' }).tap();
assert.match(await page.locator('.sheet .form-error').innerText(), /foto o escribe una nota/);
await page.locator('input[name="albumPhoto"]').setInputFiles('icons/apple-touch-icon.png');
await page.locator('.album-preview img').waitFor();
await page.fill('textarea[name="notes"]', 'Primera sonrisa');
await page.screenshot({ path: `${shots}/nia-album-mes.png` });
await page.getByRole('button', { name: 'Guardar en el álbum' }).tap();
await sheetGone();
await toastSays('Guardado en “1 mes”');
await page.locator('[data-album="1"].has-photo img').waitFor();
assert.match(await page.locator('#view-nia .section-head').first().innerText(), /1 de 13 fotos/);
step('Álbum: exige foto o nota; guarda la foto y la nota de “1 mes”');

// Editar sin duplicar
await page.locator('[data-album="1"]').tap();
assert.equal(await page.inputValue('textarea[name="notes"]'), 'Primera sonrisa');
await page.fill('textarea[name="notes"]', 'Primera sonrisa y primer baño');
await page.getByRole('button', { name: 'Guardar en el álbum' }).tap();
await sheetGone();
assert.equal(await page.evaluate(async () => (await import('/js/store.js')).store.all('album').length), 1);
step('Editar un mes no crea duplicados');

// Persistencia
await page.reload();
await page.locator('#view-nia .album-grid').waitFor();
await page.locator('[data-album="1"].has-photo img').waitFor();
await page.locator('#view-nia .photo-frame img').waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: `${shots}/nia.png` });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.screenshot({ path: `${shots}/nia-album.png` });
step('Al volver a abrir siguen los datos, la foto y el álbum');

// "Borrar todos los registros" no toca el álbum ni los datos
await page.getByRole('tab', { name: 'Hoy' }).tap();
await page.getByRole('button', { name: 'Ajustes' }).tap();
await page.locator('[data-wipe]').tap();
await page.locator('.dialog').getByRole('button', { name: 'Borrar todo' }).tap();
await toastSays('Registros borrados');
await closeSheet();
const left = await page.evaluate(async () => { const { store } = await import('/js/store.js'); return [store.all('album').length, store.settings.bloodType]; });
assert.deepEqual(left, [1, 'A+']);
step('“Borrar todos los registros” no borra el álbum ni los datos personales');

// Vaciar un mes y quitar foto
await page.getByRole('tab', { name: 'Nia' }).tap();
await page.locator('[data-album="1"]').tap();
await page.locator('.sheet').getByRole('button', { name: 'Quitar foto' }).tap();
await page.fill('textarea[name="notes"]', '');
await page.getByRole('button', { name: 'Guardar en el álbum' }).tap();
await page.locator('.dialog').getByRole('button', { name: 'Vaciar' }).tap();
await sheetGone();
assert.equal(await page.evaluate(async () => (await import('/js/store.js')).store.all('album').length), 0);
await page.locator('#view-nia').getByRole('button', { name: 'Quitar foto' }).tap();
await page.locator('.dialog').getByRole('button', { name: 'Quitar foto' }).tap();
await page.locator('#view-nia .scene-banner svg.scene').waitFor();
step('Vaciar un mes y quitar la foto de cabecera, con confirmación');

assert.deepEqual(errors, []);
step('Sin errores de JavaScript');
await browser.close();
