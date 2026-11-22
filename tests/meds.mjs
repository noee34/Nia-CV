// Medicación: alta con horas, tarjeta en Hoy, dar/deshacer, WhatsApp editable,
// aviso al llegar la hora y alarmas del Calendario. Requiere `npm start`.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const URL = process.env.APP_URL || 'http://localhost:5173/';
const shots = process.argv[2] || 'docs/screenshots';
const step = (m) => console.log('✓', m);

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES', timezoneId: 'Europe/Madrid', serviceWorkers: 'block' });
await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const SUPABASE_URL = ''; export const SUPABASE_ANON_KEY = '';" }));
await ctx.addInitScript(() => {
  window.__opened = [];
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.href.startsWith('data:text/calendar')) { window.__opened.push(decodeURIComponent(this.href.split(',')[1])); return; } return click.call(this); };
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const sheetGone = () => page.locator('.sheet-root').waitFor({ state: 'detached' });
const nowHM = await page.evaluate(() => new Date().toTimeString().slice(0, 5));

await page.goto(URL + '#medicina');
await page.locator('[data-med-tab="medicacion"]').tap();
await page.locator('#view-medicina').getByText('Sin medicación').waitFor();
step('Medicina tiene el apartado Medicación (vacío al empezar)');

// Alta: Vitamina D, 5 gotas, a las 09:00, 21:00 y a la hora actual
await page.getByRole('button', { name: 'Añadir medicación' }).tap();
await page.locator('[data-mtype="vitamina"]').tap();
await page.fill('input[name="name"]', 'Vitamina D');
await page.fill('input[name="dose"]', '5 gotas');
await page.locator('[data-preset="1"]').tap();
await page.fill('input[name="newTime"]', nowHM);
await page.locator('[data-add-time]').tap();
const times = await page.locator('.times-list .chip').allInnerTexts();
assert.ok(times.some((t) => t.includes('09:00')) && times.some((t) => t.includes('21:00')) && times.some((t) => t.includes(nowHM)));
await page.screenshot({ path: `${shots}/medicacion-nueva.png` });
await page.getByRole('button', { name: 'Guardar medicación' }).tap();
await page.locator('.dialog').getByRole('button', { name: 'Añadir alarmas' }).tap();
const ics = (await page.evaluate(() => window.__opened))[0];
assert.ok(ics && (ics.match(/BEGIN:VEVENT/g) || []).length === new Set(['09:00', '21:00', nowHM]).size);
assert.ok(ics.includes('RRULE:FREQ=DAILY') && ics.includes('TRIGGER:-PT0M') && ics.includes('Vitamina D · 5 gotas'));
step('Vitamina D guardada con sus horas y alarmas diarias enviadas al Calendario');

await page.locator('#view-medicina .med-card').waitFor();
assert.match(await page.locator('#view-medicina .med-card').innerText(), /Vitamina D[\s\S]*5 gotas[\s\S]*09:00[\s\S]*21:00/);
await page.screenshot({ path: `${shots}/medicacion.png` });
step('Aparece en la lista con sus horas y en las tomas de hoy');

// Hoy: tarjeta con aviso "toca ahora" y botón de WhatsApp
await page.getByRole('tab', { name: 'Hoy' }).tap();
await page.locator('#view-hoy .meds-card.urgent .meds-alert').waitFor();
assert.match(await page.locator('#view-hoy .meds-alert').innerText(), /Vitamina D[\s\S]*toca ahora/);
const wa = await page.locator(`#view-hoy .dose-row.ahora .wa-btn`).first().getAttribute('href');
assert.ok(wa.startsWith('https://wa.me/?text='));
assert.match(decodeURIComponent(wa), /toca darle a Nia Vitamina D \(5 gotas\) a las \d\d:\d\d/);
await page.screenshot({ path: `${shots}/medicacion-hoy.png` });
step('Hoy avisa de la toma que toca ahora y el botón de WhatsApp lleva el mensaje');

// Dar y deshacer
await page.locator('#view-hoy .dose-row.ahora [data-give-dose]').first().tap();
await page.locator('.toast').filter({ hasText: 'Vitamina D: dada' }).waitFor();
await page.locator('#view-hoy .dose-row.dada').first().waitFor();
assert.match(await page.locator('#view-hoy .dose-row.dada').first().innerText(), /Dada a las/);
await page.locator('#view-hoy [data-undo-dose]').first().tap();
await page.locator('.dialog').getByRole('button', { name: 'Marcar como no dada' }).tap();
await page.locator('#view-hoy .dose-row.ahora').first().waitFor();
step('Marcar una toma como dada y deshacerlo, con confirmación');

// Mensaje de WhatsApp editable desde la pestaña Nia
await page.getByRole('tab', { name: 'Nia' }).tap();
await page.locator('#view-nia .wa-bubble').waitFor();
await page.locator('#view-nia [data-action="edit-wa"]').tap();
await page.fill('textarea[name="template"]', 'Hola, dale ');
await page.locator('[data-field="{medicamento}"]').tap();
await page.locator('textarea[name="template"]').press('End');
await page.locator('textarea[name="template"]').type(' a {bebe} a las {hora}');
await page.fill('input[name="phone"]', '+34 600 11 22 33');
assert.equal(await page.locator('[data-preview]').innerText(), 'Hola, dale Vitamina D a Nia a las 09:00');
await page.screenshot({ path: `${shots}/medicacion-whatsapp.png` });
await page.getByRole('button', { name: 'Guardar mensaje' }).tap();
await sheetGone();
await page.getByRole('tab', { name: 'Hoy' }).tap();
await page.waitForFunction(() => document.querySelector('#view-hoy:not([hidden]) .dose-row.ahora .wa-btn')?.href.includes('wa.me/34600112233'), null, { timeout: 5000 });
const wa2 = await page.locator('#view-hoy .dose-row.ahora .wa-btn').first().getAttribute('href');
assert.ok(wa2.startsWith('https://wa.me/34600112233?text='));
assert.match(decodeURIComponent(wa2), /^https:\/\/wa\.me\/34600112233\?text=Hola, dale Vitamina D a Nia a las \d\d:\d\d$/);
step('El mensaje y el teléfono se editan en la pestaña Nia y el botón los usa');

// Aviso al llegar la hora (también si la app estaba cerrada)
await page.evaluate(async () => {
  const { store } = await import('/js/store.js');
  const t = new Date(Date.now() - 5 * 60000).toTimeString().slice(0, 5);
  await store.save('meds', { name: 'Hierro', type: 'medicamento', dose: '1 ml', times: [t], startDate: new Date().toLocaleDateString('sv'), endDate: null, notes: '', paused: false, at: Date.now() });
  localStorage.setItem('nia-cv:medicacion-avisos-hasta', String(Date.now() - 30 * 60000));
});
await page.reload();
await page.locator('.dialog').filter({ hasText: 'Es la hora de la medicación' }).waitFor({ timeout: 6000 });
assert.match(await page.locator('.dialog').innerText(), /Hierro[\s\S]*1 ml/);
assert.ok((await page.locator('.dialog .btn-whatsapp').getAttribute('href')).includes('wa.me/34600112233'));
await page.screenshot({ path: `${shots}/medicacion-aviso.png` });
await page.locator('.dialog').getByRole('button', { name: '✓ Marcar como dada' }).tap();
await page.locator('.toast').filter({ hasText: 'Hierro: dada' }).waitFor();
step('Al abrir la app avisa de la toma de hace 5 minutos y se marca como dada desde el aviso');

// Pausar y eliminar
await page.getByRole('tab', { name: 'Medicina' }).tap();
await page.locator('[data-med-tab="medicacion"]').tap();
await page.locator('#view-medicina .med-card', { hasText: 'Hierro' }).tap();
await page.getByRole('button', { name: 'Pausar (sin borrar)' }).tap();
await sheetGone();
await page.getByRole('tab', { name: 'Hoy' }).tap();
await page.waitForFunction(() => { const v = document.querySelector('#view-hoy:not([hidden])'); return v && !v.innerText.includes('Hierro'); }, null, { timeout: 5000 });
await page.getByRole('tab', { name: 'Medicina' }).tap();
await page.locator('#view-medicina .med-card', { hasText: 'Hierro' }).tap();
await page.getByRole('button', { name: 'Eliminar medicación' }).tap();
await page.locator('.dialog').getByRole('button', { name: 'Eliminar' }).tap();
await sheetGone();
assert.equal(await page.evaluate(async () => (await import('/js/store.js')).store.all('meds').length), 1);
step('Pausar la quita de Hoy; eliminar con confirmación');

await page.reload();
await page.locator('[data-med-tab="medicacion"]').tap();
await page.locator('#view-medicina .med-card').first().waitFor();
assert.equal(await page.evaluate(async () => (await import('/js/store.js')).store.all('meds').length), 1);
step('La medicación sigue al volver a abrir la app');

assert.deepEqual(errors, []);
step('Sin errores de JavaScript');
await browser.close();
