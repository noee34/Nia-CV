// Sólidos: pestaña Comidas → Sólidos, registrar, primera vez automática, síntomas,
// aviso cuando sienta mal, alimentos probados, tarjeta y actividad en Hoy.
// Requiere `npm start`.
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
const sheetGone = () => page.locator('.sheet-root').waitFor({ state: 'detached' });
const V = '#view-biberones';

await page.goto(URL);
assert.equal(await page.locator('#view-hoy .solids-card').count(), 0, 'sin sólidos no sale la tarjeta en Hoy');
await page.getByRole('tab', { name: 'Comidas', exact: true }).tap();
await page.locator(`${V} [data-food-tab="solidos"]`).tap();
await page.locator(V).getByText('Todavía no hay comidas sólidas hoy').waitFor();
step('La pestaña se llama Comidas y tiene Biberones | Sólidos');

// 1ª comida: calabaza, le sentó bien
await page.getByRole('button', { name: 'Registrar comida' }).tap();
await page.fill('input[name="food"]', 'Puré de calabaza');
assert.equal(await page.locator('input[name="firstTime"]').isChecked(), true, 'primera vez automática');
await page.locator('[data-texture="pure"]').tap();
await page.locator('[data-amount="casi"]').tap();
await page.locator('[data-liked="encanto"]').tap();
assert.equal(await page.locator('.symptoms-field').isHidden(), true);
await page.screenshot({ path: `${shots}/solidos-nuevo.png` });
await page.getByRole('button', { name: 'Guardar comida' }).tap();
await sheetGone();
const row = page.locator(`${V} .solid-row`).first();
assert.match(await row.innerText(), /Puré de calabaza[\s\S]*Primera vez[\s\S]*Casi todo[\s\S]*Bien[\s\S]*Puré · Le encantó/);
step('Calabaza guardada: primera vez, casi todo, le sentó bien');

// 2ª comida: huevo, le sentó mal con síntomas → aviso con 112
await page.getByRole('button', { name: 'Registrar comida' }).tap();
await page.fill('input[name="food"]', 'Huevo');
await page.locator('[data-amount="poco"]').tap();
await page.locator('[data-tol="mal"]').tap();
await page.locator('.symptoms-field').waitFor();
await page.locator('[data-symptom="Ronchas o erupción"]').tap();
await page.locator('[data-symptom="Vómito"]').tap();
await page.getByRole('button', { name: 'Guardar comida' }).tap();
await sheetGone();
const dlg = page.locator('.dialog');
await dlg.waitFor();
assert.match(await dlg.innerText(), /Huevo le sentó mal[\s\S]*pediatra[\s\S]*112/);
await page.screenshot({ path: `${shots}/solidos-aviso.png` });
await dlg.getByRole('button', { name: 'Entendido' }).tap();
assert.match(await page.locator(`${V} .solid-row`).nth(1).innerText(), /Huevo[\s\S]*Mal[\s\S]*Ronchas o erupción, Vómito/);
step('Huevo le sentó mal: guarda síntomas y muestra el aviso (pediatra / 112)');

// Repetir calabaza desde "Alimentos probados": ya no es primera vez
const foods = page.locator(`${V} .food-row`);
assert.equal(await foods.count(), 2);
assert.match(await foods.first().innerText(), /Huevo[\s\S]*1 vez mal/, 'los que sentaron mal salen primero');
await page.locator(`${V} [data-foods-filter="mal"]`).tap();
assert.equal(await page.locator(`${V} .food-row`).count(), 1);
await page.locator(`${V} [data-foods-filter="todos"]`).tap();
await page.locator(`${V} .food-row[data-food="Puré de calabaza"]`).tap();
assert.equal(await page.inputValue('input[name="food"]'), 'Puré de calabaza');
assert.equal(await page.locator('input[name="firstTime"]').isChecked(), false, 'ya lo había probado');
await page.getByRole('button', { name: 'Guardar comida' }).tap();
await sheetGone();
assert.match(await page.locator(`${V} .food-row[data-food="Puré de calabaza"]`).innerText(), /2 veces/);
assert.match(await page.locator(V).innerText(), /3 comidas · 2 alimentos nuevos · le sentó mal/);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: `${shots}/solidos.png`, fullPage: true });
step('Alimentos probados: contador, filtro y repetir sin marcar primera vez');

// Editar: el huevo ahora regular
await page.locator(`${V} .solid-row`).nth(1).tap();
await page.locator('[data-tol="regular"]').tap();
await page.getByRole('button', { name: 'Guardar cambios' }).tap();
await sheetGone();
assert.equal(await page.locator('.dialog').count(), 0, 'sin aviso al no ser "mal"');
assert.match(await page.locator(`${V} .solid-row`).nth(1).innerText(), /Huevo[\s\S]*Regular/);
step('Editar una comida');

// Biberones sigue funcionando
await page.locator(`${V} [data-food-tab="biberones"]`).tap();
await page.getByRole('button', { name: 'Registrar biberón' }).waitFor();
step('Biberones sigue en su sitio');

// Hoy: tarjeta + actividad reciente
await page.getByRole('tab', { name: 'Hoy' }).tap();
await page.waitForFunction(() => !document.querySelector('#view-hoy').hidden);
const card = page.locator('#view-hoy .solids-card');
assert.match(await card.innerText(), /Sólidos de hoy[\s\S]*3[\s\S]*comidas[\s\S]*Puré de calabaza/i);
assert.equal(await page.locator('#view-hoy .tl-dot.solid').count(), 3);
await page.locator('#view-hoy .tl-btn[data-edit="solids"]').first().tap();
await page.locator('.sheet-root').getByText('Editar comida').first().waitFor();
await page.locator('.sheet-root button[data-close]').tap();
await sheetGone();
step('Hoy: tarjeta “Sólidos de hoy” y comidas en la actividad reciente (editables)');

// Eliminar
await page.getByRole('tab', { name: 'Comidas', exact: true }).tap();
await page.locator(`${V} [data-food-tab="solidos"]`).tap();
await page.locator(`${V} .solid-row`).last().tap();
await page.getByRole('button', { name: 'Eliminar comida' }).tap();
await page.locator('.dialog').getByRole('button', { name: 'Eliminar' }).tap();
await sheetGone();
assert.equal(await page.locator(`${V} .solid-row`).count(), 2);
step('Eliminar una comida');

// Persistencia tras recargar
await page.reload();
await page.getByRole('tab', { name: 'Comidas', exact: true }).tap();
await page.locator(`${V} [data-food-tab="solidos"]`).tap();
assert.equal(await page.locator(`${V} .solid-row`).count(), 2);
step('Se conserva al recargar');

// Validación
await page.getByRole('button', { name: 'Registrar comida' }).tap();
await page.getByRole('button', { name: 'Guardar comida' }).tap();
assert.match(await page.locator('.form-error').innerText(), /qué comió/);
step('Pide el alimento si falta');

assert.deepEqual(errors, []);
await browser.close();
console.log('\nSólidos OK');
