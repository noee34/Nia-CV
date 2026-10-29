// Modo de color: automático, claro y oscuro (Ajustes → Apariencia).
// Requiere el servidor en marcha (npm start).
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const URL = process.env.APP_URL || 'http://localhost:5173/';
const shots = process.argv[2] || 'docs/screenshots';
const step = (m) => console.log('✓', m);

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES', colorScheme: 'light', serviceWorkers: 'block' });
await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const SUPABASE_URL = ''; export const SUPABASE_ANON_KEY = '';" }));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const LIGHT = 'rgb(247, 243, 237)', DARK = 'rgb(29, 25, 22)';

await page.goto(URL);
await page.locator('.h-display').waitFor();
assert.equal(await bg(), LIGHT);
step('Automático con el móvil en claro → claro');

const pick = async (label) => {
  await page.getByRole('button', { name: 'Ajustes' }).tap();
  await page.getByRole('radio', { name: label }).tap();
  await page.getByRole('button', { name: 'Cerrar' }).tap();
  await page.locator('.sheet-root').waitFor({ state: 'detached' });
};

await pick('Oscuro');
assert.equal(await bg(), DARK);
assert.equal(await page.evaluate(() => document.querySelector('meta[name="theme-color"]').content), '#1D1916');
await page.screenshot({ path: `${shots}/tema-oscuro.png` });
step('Elegir Oscuro aunque el móvil esté en claro → oscuro (también la barra superior)');

// Al volver a abrir, la elección se aplica antes de pintar (sin destello claro)
await page.reload({ waitUntil: 'commit' });
await page.waitForFunction(() => document.body);
assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
await page.locator('.h-display').waitFor();
assert.equal(await bg(), DARK);
step('Al volver a abrir la app sigue en oscuro desde el primer momento');

await page.emulateMedia({ colorScheme: 'dark' });
await pick('Claro');
assert.equal(await bg(), LIGHT);
step('Elegir Claro con el móvil en oscuro → claro');

await pick('Automático');
assert.equal(await bg(), DARK);
await page.emulateMedia({ colorScheme: 'light' });
assert.equal(await bg(), LIGHT);
assert.equal(await page.evaluate(() => localStorage.getItem('nia-cv:theme')), null);
step('Automático vuelve a seguir al móvil');

await page.getByRole('button', { name: 'Ajustes' }).tap();
await page.locator('.sheet [data-theme-pick]').first().waitFor();
await page.screenshot({ path: `${shots}/tema-ajustes.png` });
assert.deepEqual(errors, []);
step('Sin errores de JavaScript');
await browser.close();
