// Comprueba que la app abre sin conexión tras la primera visita (service worker).
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES' });
const page = await ctx.newPage();
await page.goto(process.env.APP_URL || 'http://localhost:5173/');
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload();
await ctx.setOffline(true);
await page.reload();
await page.locator('.h-display').waitFor({ timeout: 5000 });
assert.match(await page.locator('.h-display').innerText(), /hoy/);
const fontsOk = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('500 20px "Cormorant Garamond"'); });
assert.ok(fontsOk, 'fuentes disponibles sin conexión');
console.log('✓ Abre sin conexión con sus fuentes');
await browser.close();
