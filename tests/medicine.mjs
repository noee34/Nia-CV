// Pestaña Medicina: citas del médico y de la especialista, avisos y Calendario del iPhone.
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
// Captura los archivos de calendario que la app intenta abrir
await ctx.addInitScript(() => {
  window.__opened = [];
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.href.startsWith('data:text/calendar')) { window.__opened.push(decodeURIComponent(this.href.split(',')[1])); return; } return click.call(this); };
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const sheetGone = () => page.locator('.sheet-root').waitFor({ state: 'detached' });
const tomorrow = await page.evaluate(() => { const d = new Date(Date.now() + 86400000); return d.toLocaleDateString('sv'); });

await page.goto(URL + '#medicina');
await page.locator('#view-medicina .scene-banner svg.scene').waitFor();
assert.match(await page.locator('#view-medicina .segmented').innerText(), /Médico[\s\S]*Especialista · Angela/);
assert.match(await page.locator('#view-medicina').innerText(), /No hay citas próximas/);
step('Pestaña Medicina con escena, secciones Médico y Especialista · Angela');

// Nueva vacuna para mañana a las 10:00 con avisos por defecto (1 día y 1 hora antes)
await page.getByRole('button', { name: 'Nueva cita' }).first().tap();
await page.locator('[data-kind="vacuna"]').tap();
await page.fill('input[name="title"]', 'Hexavalente 2.ª dosis');
assert.equal(await page.inputValue('input[name="date"]'), tomorrow);
assert.equal(await page.inputValue('input[name="time"]'), '10:00');
await page.fill('input[name="place"]', 'Centro de Salud, consulta 4');
await page.locator('[data-rem="10080"]').tap(); // + 1 semana antes
const pressed = await page.locator('[data-rem][aria-pressed="true"]').evaluateAll((els) => els.map((e) => Number(e.dataset.rem)));
assert.deepEqual(pressed.sort((a, b) => a - b), [60, 1440, 10080]);
await page.screenshot({ path: `${shots}/medicina-nueva.png` });
await page.getByRole('button', { name: 'Guardar cita' }).tap();
await page.locator('.dialog').getByRole('button', { name: 'Añadir al Calendario' }).tap();
const ics = (await page.evaluate(() => window.__opened))[0];
assert.ok(ics && ics.includes('BEGIN:VEVENT') && ics.includes('SUMMARY:Vacuna · Hexavalente 2.ª dosis (Nia)'));
assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 3);
assert.ok(ics.includes('TRIGGER:-P7D') && ics.includes('TRIGGER:-P1D') && ics.includes('TRIGGER:-PT1H'));
assert.ok(ics.includes('LOCATION:Centro de Salud\\, consulta 4'));
step('Vacuna guardada y enviada al Calendario del iPhone con 3 avisos (1 semana, 1 día, 1 hora)');

await page.locator('#view-medicina .cita-row').first().waitFor();
assert.match(await page.locator('#view-medicina .cita-row').first().innerText(), /Vacuna · Hexavalente[\s\S]*Mañana · 10:00[\s\S]*Centro de Salud/);
const cell = page.locator(`#mcal [data-day="${tomorrow}"] .dot.b`);
assert.equal(await cell.count(), 1, 'el día de la cita tiene su punto en el calendario');
await page.screenshot({ path: `${shots}/medicina.png` });
step('Aparece en Próximas citas y marcada en el calendario');

await page.locator('[data-med-filter="receta"]').tap();
assert.match(await page.locator('#view-medicina').innerText(), /No hay citas próximas/);
await page.locator('[data-med-filter="vacuna"]').tap();
assert.equal(await page.locator('#view-medicina .section .cita-row').count() >= 1, true);
await page.locator('[data-med-filter="all"]').tap();
step('Filtros por tipo: Recetas vacío, Vacunas con la cita');

// Hoy muestra la próxima cita
await page.getByRole('tab', { name: 'Hoy' }).tap();
await page.locator('#view-hoy .next-cita').waitFor();
assert.match(await page.locator('#view-hoy .next-cita').innerText(), /Próxima cita[\s\S]*Vacuna · Hexavalente[\s\S]*Mañana · 10:00/i);
await page.screenshot({ path: `${shots}/medicina-hoy.png` });
await page.locator('#view-hoy .next-cita').tap();
await page.locator('.sheet form').waitFor();
await page.getByRole('button', { name: 'Cerrar' }).first().tap();
await sheetGone();
step('Hoy muestra la próxima cita y al tocarla se abre');

// Especialista Angela
await page.getByRole('tab', { name: 'Medicina' }).tap();
await page.locator('[data-med-section="especialista"]').tap();
assert.match(await page.locator('#view-medicina .specialist-card').innerText(), /Angela/);
await page.getByRole('button', { name: 'Nueva cita' }).first().tap();
assert.equal(await page.inputValue('input[name="doctor"]'), 'Angela');
assert.equal(await page.locator('.kinds-field').isHidden(), true);
await page.fill('input[name="title"]', 'Seguimiento');
await page.fill('input[name="date"]', await page.evaluate(() => new Date(Date.now() + 5 * 86400000).toLocaleDateString('sv')));
await page.fill('input[name="time"]', '17:30');
await page.getByRole('button', { name: 'Guardar cita' }).tap();
await page.locator('.dialog').getByRole('button', { name: 'Ahora no' }).tap();
await page.locator('#view-medicina .cita-row').first().waitFor();
assert.match(await page.locator('#view-medicina .cita-row').first().innerText(), /Angela · Seguimiento[\s\S]*17:30/);
await page.screenshot({ path: `${shots}/medicina-especialista.png` });
step('Especialista: la cita con Angela viene con su nombre puesto y aparece en su sección');

// Recordatorio dentro de la app (también los que tocaron con la app cerrada)
await page.evaluate(async () => {
  const { store } = await import('/js/store.js');
  await store.save('citas', { at: Date.now() + 59 * 60000, section: 'medico', kind: 'pediatra', title: 'Revisión de peso', doctor: '', place: '', notes: '', reminders: [60], done: false });
  localStorage.setItem('nia-cv:avisos-hasta', String(Date.now() - 5 * 60000));
});
await page.reload();
await page.locator('.dialog').filter({ hasText: 'Recordatorio de cita' }).waitFor({ timeout: 6000 });
assert.match(await page.locator('.dialog').innerText(), /Pediatra · Revisión de peso[\s\S]*hoy[\s\S]*1 hora antes/);
await page.screenshot({ path: `${shots}/medicina-aviso.png` });
await page.locator('.dialog').getByRole('button', { name: 'Ver citas' }).tap();
await page.locator('#view-medicina').waitFor({ state: 'visible' });
step('Al abrir la app avisa de la cita de dentro de una hora (aviso “1 hora antes”)');

// Marcar como hecha → pasa al historial
await page.locator('[data-med-section="medico"]').tap();
await page.locator('#view-medicina .cita-row', { hasText: 'Revisión de peso' }).first().tap();
await page.getByRole('button', { name: '✓ Marcar como hecha' }).tap();
await sheetGone();
await page.locator('#hist-m').waitFor();
assert.match(await page.locator('#view-medicina').innerText(), /Historial[\s\S]*Revisión de peso[\s\S]*Hecha/);
step('Marcar como hecha la pasa al historial');

// Eliminar con confirmación
await page.locator('#view-medicina .cita-row', { hasText: 'Hexavalente' }).first().tap();
await page.getByRole('button', { name: 'Eliminar cita' }).tap();
await page.locator('.dialog').getByRole('button', { name: 'Eliminar cita' }).tap();
await sheetGone();
assert.equal(await page.evaluate(async () => (await import('/js/store.js')).store.all('citas').length), 2);
step('Eliminar una cita, con confirmación');

// Persisten y no las borra "Borrar todos los registros"
await page.reload();
await page.locator('#view-medicina .cita-row').first().waitFor();
assert.equal(await page.evaluate(async () => (await import('/js/store.js')).store.all('citas').length), 2);
step('Las citas siguen al volver a abrir la app');

assert.deepEqual(errors, []);
step('Sin errores de JavaScript');
await browser.close();
