// Prueba de extremo a extremo en un navegador emulando un iPhone.
// Requiere el servidor en marcha (npm start) y Playwright con Chromium.
// Uso: node tests/e2e.mjs [carpeta-capturas]
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const URL = process.env.APP_URL || 'http://localhost:5173/';
const shots = process.argv[2] || 'docs/screenshots';
await mkdir(shots, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices['iPhone 13'],
  locale: 'es-ES',
  timezoneId: 'Europe/Madrid',
  colorScheme: process.env.SCHEME || 'light',
});
// Esta prueba es del modo sin cuenta: simula un config.js vacío.
await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const SUPABASE_URL = ''; export const SUPABASE_ANON_KEY = '';" }));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const shot = (name) => page.screenshot({ path: `${shots}/${name}.png`, fullPage: false });
const shotFull = (name) => page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
const text = (sel) => page.locator(sel).first().innerText();
const step = (msg) => console.log('✓', msg);
const waitToast = async (re) => {
  await page.locator('.toast').filter({ hasText: re }).waitFor();
  await page.locator('.toast').waitFor({ state: 'detached', timeout: 5000 });
};
const closeSheetWait = () => page.locator('.sheet-root').waitFor({ state: 'detached' });

await page.goto(URL);
await page.locator('.h-display').waitFor();
assert.match(await text('.h-display'), /Nia, hoy/);
assert.match(await text('#view-hoy'), /Todavía no hay biberones registrados hoy/);
assert.match(await text('#view-hoy'), /Cuando registres una deposición, aparecerá aquí/);
await shot('01-hoy-vacio');
step('Pantalla Hoy vacía con mensajes amables');

// --- Registrar biberón: 150 preparados, 120 tomados ---
await page.getByRole('button', { name: 'Añadir biberón' }).tap();
await page.locator('.sheet form').waitFor();
const now = await page.evaluate(() => { const d = new Date(); return { date: d.toLocaleDateString('sv'), time: d.toTimeString().slice(0, 5) }; });
assert.equal(await page.inputValue('input[name="date"]'), now.date);
assert.equal(await page.inputValue('input[name="time"]'), now.time);
step('Fecha y hora actuales rellenadas automáticamente');
await page.locator('[data-quick="120"]').tap();
assert.equal(await page.inputValue('input[name="taken"]'), '120');
assert.equal(await page.inputValue('input[name="prepared"]'), '120');
await page.locator('[data-step="prepared"][data-d="10"]').tap();
await page.locator('[data-step="prepared"][data-d="10"]').tap();
await page.locator('[data-step="prepared"][data-d="10"]').tap();
assert.equal(await page.inputValue('input[name="prepared"]'), '150');
await shot('02-formulario-biberon');
await page.getByRole('button', { name: 'Guardar biberón' }).tap();
await waitToast(/Biberón guardado · 120 ml/);
await closeSheetWait();
step('Biberón guardado con confirmación');

// --- Biberón anterior, cantidad manual intermedia ---
await page.getByRole('button', { name: 'Añadir biberón' }).tap();
await page.locator('.sheet form').waitFor();
assert.equal(await page.inputValue('input[name="prepared"]'), '150', 'recuerda la última cantidad preparada');
await page.getByRole('button', { name: 'Hace 1 h' }).tap();
await page.fill('input[name="taken"]', '95');
await page.getByRole('button', { name: 'Añadir observación' }).tap();
await page.fill('textarea[name="notes"]', 'Se quedó dormida al final');
await page.getByRole('button', { name: 'Guardar biberón' }).tap();
await waitToast(/95 ml/);
await closeSheetWait();
step('Biberón anterior con cantidad manual y observación');

// --- Validación: tomado > preparado ---
await page.getByRole('button', { name: 'Añadir biberón' }).tap();
await page.locator('.sheet form').waitFor();
await page.fill('input[name="prepared"]', '100');
await page.fill('input[name="taken"]', '130');
// "preparado" ya fue tocado manualmente, así que no se ajusta solo
await page.getByRole('button', { name: 'Guardar biberón' }).tap();
assert.match(await text('.form-error'), /no puede superar/);
step('Validación: lo tomado no supera lo preparado');
await page.getByRole('button', { name: 'Cerrar' }).tap();
await closeSheetWait();

let card = await text('#view-hoy .card:nth-of-type(1)');
assert.match(card, /2\s*tomas/);
assert.match(card, /215 ml registrados/);
step('Tarjeta Hoy: 2 tomas · 215 ml');

// --- Registrar caca ---
await page.getByRole('button', { name: 'Registrar caca' }).tap();
await page.locator('.sheet form').waitFor();
await page.locator('[data-cons="blanda"]').tap();
await page.getByRole('button', { name: 'Añadir observación' }).tap();
await page.getByRole('button', { name: 'Amarilla' }).tap();
await shot('03-formulario-caca');
await page.getByRole('button', { name: 'Guardar deposición' }).tap();
await waitToast(/Deposición guardada/);
await closeSheetWait();
card = await text('#view-hoy article:nth-of-type(2)');
assert.match(card, /1\s*deposición hoy/);
assert.match(card, /Blanda/);
step('Deposición registrada y reflejada en Hoy');

// --- Editar desde la cronología ---
assert.equal(await page.locator('.timeline .tl-item').count(), 3);
await page.locator('.timeline [data-edit="bottles"]').last().tap();
await page.locator('.sheet form').waitFor();
assert.equal(await page.inputValue('input[name="taken"]'), '120');
await page.locator('[data-quick="150"]').tap();
await page.getByRole('button', { name: 'Guardar cambios' }).tap();
await waitToast(/Cambios guardados/);
await closeSheetWait();
assert.match(await text('#view-hoy .card'), /245 ml registrados/);
assert.equal(await page.locator('.timeline .tl-item').count(), 3, 'editar no duplica');
step('Edición recalcula totales sin duplicar');

// --- Eliminar con confirmación (cancelar y luego confirmar) ---
await page.locator('.timeline [data-edit="bottles"]').first().tap();
await page.locator('.sheet form').waitFor();
await page.getByRole('button', { name: 'Eliminar biberón' }).tap();
await page.locator('.dialog').waitFor();
await shot('04-confirmar-eliminar');
await page.locator('.dialog').getByRole('button', { name: 'Cancelar' }).tap();
assert.equal(await page.locator('.dialog').count(), 0);
await page.getByRole('button', { name: 'Eliminar biberón' }).tap();
await page.locator('.dialog').getByRole('button', { name: 'Eliminar' }).tap();
await waitToast(/Biberón eliminado/);
await closeSheetWait();
assert.match(await text('#view-hoy .card'), /1\s*toma/);
assert.match(await text('#view-hoy .card'), /150 ml registrados/);
step('Eliminación con confirmación y totales actualizados');

// --- Persistencia tras recargar ---
await page.reload();
await page.locator('.h-display').waitFor();
assert.match(await text('#view-hoy .card'), /150 ml registrados/);
assert.equal(await page.locator('.timeline .tl-item').count(), 2);
step('Los datos persisten tras cerrar y abrir la app');

// --- Sembrar historial de días anteriores (para calendarios y gráficos) ---
await page.evaluate(async () => {
  const { store } = await import('/js/store.js');
  const day = (n, h, m) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, m, 0, 0); return d.getTime(); };
  const cons = ['blanda', 'normal', 'blanda', 'dura', 'normal', 'liquida', 'blanda'];
  for (let n = 1; n <= 40; n++) {
    const times = [[0, 40], [3, 50], [7, 15], [10, 30], [13, 45], [17, 10], [20, 30]].slice(0, 5 + (n % 3));
    for (const [h, m] of times) {
      const prepared = [120, 150, 150, 180][(n + h) % 4];
      await store.save('bottles', { at: day(n, h, m), prepared, taken: prepared - [0, 10, 20, 30, 0][(n * h) % 5], notes: n === 2 && h === 3 ? 'Tomó con calma' : '' });
    }
    for (let k = 0; k < (n % 4 === 0 ? 0 : (n % 3) + 1); k++) {
      await store.save('poops', { at: day(n, 9 + k * 5, 15), consistency: cons[(n + k) % cons.length], notes: n === 1 && k === 0 ? 'Poca cantidad, amarilla' : '' });
    }
  }
});
await page.evaluate(() => window.scrollTo(0, 0));
await shotFull('05-hoy-completo');
await shot('05-hoy');
step('Historial de prueba sembrado');

// --- Biberones ---
await page.getByRole('tab', { name: 'Biberones' }).tap();
await page.locator('#view-biberones .daynav').waitFor();
assert.match(await text('.daynav-title'), /Hoy/);
assert.equal(await page.locator('[data-day-step="1"]').isDisabled(), true);
await page.locator('[data-day-step="-1"]').tap();
assert.match(await text('.daynav-title'), /Ayer/);
const rows = await page.locator('#view-biberones .list .row').count();
const sumTxt = await text('#view-biberones .summary');
assert.match(sumTxt, new RegExp(`${rows}\\s*Tomas`, "i"));
const takenSum = await page.evaluate(() => [...document.querySelectorAll('#view-biberones .row-title')].reduce((s, e) => s + parseInt(e.textContent), 0));
assert.match(sumTxt, new RegExp(`${takenSum.toLocaleString('es-ES')}\\s*ml\\s*Total tomado`, "i"));
await shotFull('06-biberones-ayer');
step(`Biberones (ayer): ${rows} tomas, total ${takenSum} ml coherente con la lista`);
// gesto de deslizar
const box = await page.locator('#view-biberones').boundingBox();
await page.evaluate(({ y }) => {
  const el = document.querySelector('#view-biberones');
  const t = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
  el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(300)], changedTouches: [t(300)], bubbles: true }));
  el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(120)], bubbles: true }));
}, { y: box.y + 300 });
assert.match(await text('.daynav-title'), /Hoy/);
step('Deslizar cambia de día');
await page.locator('.daynav-center').tap();
await page.locator('#bcal').waitFor();
await shot('07-biberones-calendario');
await page.locator('#bcal [data-day]').filter({ hasText: /^\s*1\s*$/ }).first().tap().catch(() => {});
await page.locator('.sheet-root').waitFor({ state: 'detached' }).catch(async () => { await page.getByRole('button', { name: 'Cerrar' }).tap(); });
step('Calendario de selección de día');

// --- Cacas ---
await page.getByRole('tab', { name: 'Cacas' }).tap();
await page.locator('#pcal').waitFor();
await shotFull('08-cacas');
await page.locator('#pcal [data-month="-1"]').tap();
await page.locator('#pcal [data-month="1"]').tap();
// día con varias deposiciones
const multi = page.locator('#pcal .cal-day:not(.out)').filter({ has: page.locator('.cnt') }).first();
await multi.tap();
const n = await page.locator('#view-cacas .day-detail .row').count();
assert.ok(n > 1);
step(`Calendario de cacas: día con ${n} deposiciones`);
// día sin registros
const emptyDay = page.locator('#pcal .cal-day:not(.out):not(.future)').filter({ hasNot: page.locator('.dot, .cnt') }).first();
await emptyDay.tap();
assert.match(await text('#view-cacas .day-detail'), /Sin registros/);
step('Día sin registros muestra “Sin registros”');
await page.locator('[data-filter="dura"]').tap();
const hist = await page.locator('#view-cacas .section .row').allInnerTexts();
assert.ok(hist.length > 0 && hist.every((t) => /Dura/.test(t)));
step(`Filtro “Dura”: ${hist.length} registros, todos duros`);
await page.locator('[data-filter="all"]').tap();

// --- Diario ---
await page.getByRole('tab', { name: 'Diario' }).tap();
await page.locator('.chart').waitFor();
await shotFull('09-diario-semana');
await page.locator('[data-week-step="-1"]').tap();
await page.locator('.cmp tbody tr').nth(2).tap();
await page.getByRole('tab', { name: 'Mes' }).tap();
await page.locator('#dcal').waitFor();
await shotFull('10-diario-mes');
step('Diario: semana, comparación y mes');

// --- Ajustes ---
await page.getByRole('tab', { name: 'Hoy' }).tap();
await page.getByRole('button', { name: 'Ajustes' }).tap();
await page.locator('.sheet select[name="interval"]').selectOption('180');
await shot('11-ajustes');
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.locator('[data-export="csv"]').tap(),
]);
const csvPath = `${shots}/../export-prueba.csv`;
await download.saveAs(csvPath);
step(`CSV exportado (${download.suggestedFilename()})`);
await page.getByRole('button', { name: 'Cerrar' }).tap();
await closeSheetWait();
assert.match(await text('#view-hoy .card'), /Próximo\s*\d\d:\d\d\s*Referencia orientativa/i);
step('Referencia orientativa del próximo biberón');

assert.deepEqual(errors, [], `Errores en consola: ${errors.join('\n')}`);
step('Sin errores de JavaScript');
await browser.close();
