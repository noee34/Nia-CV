// Foto de cabecera (Ajustes → Foto) y escenas de la familia en cada pantalla.
// Requiere el servidor en marcha (npm start).
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const URL = process.env.APP_URL || 'http://localhost:5173/';
const shots = process.argv[2] || 'docs/screenshots';
const step = (m) => console.log('✓', m);

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES', serviceWorkers: 'block' });
await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const SUPABASE_URL = ''; export const SUPABASE_ANON_KEY = '';" }));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(URL);
await page.locator('.h-display').waitFor();
assert.equal(await page.locator('#view-hoy .scene-banner svg.scene').count(), 1);
assert.equal(await page.locator('#view-hoy .card-badge.pup svg').count(), 2);
step('Hoy: escena del jardín y caritas de Nube y Canela en las tarjetas');

for (const [tab, view] of [['Biberones', 'biberones'], ['Cacas', 'cacas'], ['Diario', 'diario']]) {
  await page.getByRole('tab', { name: tab }).tap();
  await page.locator(`#view-${view} .scene-banner svg.scene`).waitFor({ timeout: 5000 });
}
step('Biberones, Cacas y Diario tienen su escena');
await page.getByRole('tab', { name: 'Hoy' }).tap();

// Elegir foto
await page.getByRole('button', { name: 'Ajustes' }).tap();
await page.locator('input[name="photo"]').setInputFiles('icons/icon-512.png');
await page.locator('.toast').filter({ hasText: 'Foto guardada' }).waitFor();
const size = await page.evaluate(async () => (await import('/js/store.js')).store.settings.photo.length);
assert.ok(size < 350000, `foto demasiado grande: ${size}`);
await page.locator('.sheet .photo-thumb').waitFor();
await page.screenshot({ path: `${shots}/foto-ajustes.png` });
await page.getByRole('button', { name: 'Cerrar' }).tap();
await page.locator('.sheet-root').waitFor({ state: 'detached' });
await page.locator('#view-hoy .photo-frame img').waitFor();
assert.equal(await page.locator('#view-hoy .scene-banner').count(), 0);
assert.equal(await page.locator('#view-hoy .photo-frame img').getAttribute('alt'), 'Foto de Nia');
await page.screenshot({ path: `${shots}/foto-hoy.png` });
step(`Elegir foto: se reduce (${Math.round(size / 1024)} KB) y aparece en Hoy con los cachorros`);

await page.reload();
await page.locator('#view-hoy .photo-frame img').waitFor();
step('La foto se mantiene al volver a abrir la app');

await page.getByRole('button', { name: 'Ajustes' }).tap();
await page.getByRole('button', { name: 'Quitar foto' }).tap();
await page.locator('.dialog').getByRole('button', { name: 'Quitar foto' }).tap();
await page.locator('.toast').filter({ hasText: 'Foto quitada' }).waitFor();
await page.getByRole('button', { name: 'Cerrar' }).tap();
await page.locator('.sheet-root').waitFor({ state: 'detached' });
assert.equal(await page.locator('#view-hoy .scene-banner svg.scene').count(), 1);
step('Quitar foto (con confirmación) vuelve a mostrar el jardín');

await page.locator('input[type=file][name=photo]').count(); // sin efecto
assert.deepEqual(errors, []);
step('Sin errores de JavaScript');
await browser.close();
