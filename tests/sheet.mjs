// Toques en el formulario de biberón como en un iPhone: el dedo se mueve un poco.
// La ventana no debe moverse al tocar las cantidades, y deslizar desde arriba la cierra.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const URL = process.env.APP_URL || 'http://localhost:5173/';
const step = (m) => console.log('✓', m);

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES', serviceWorkers: 'block' });
await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const SUPABASE_URL = ''; export const SUPABASE_ANON_KEY = '';" }));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL);
await page.locator('.h-display').waitFor();
await page.getByRole('button', { name: 'Añadir biberón' }).tap();
await page.locator('.sheet form').waitFor();
await page.waitForTimeout(450); // termina la animación de entrada

/** Toque "tembloroso": empieza, se mueve unos píxeles hacia abajo y termina. */
const shakyTouch = (selector, moveY) => page.evaluate(({ selector, moveY }) => {
  const el = document.querySelector(selector);
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const t = (yy) => new Touch({ identifier: 7, target: el, clientX: x, clientY: yy });
  el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(y)], changedTouches: [t(y)], bubbles: true }));
  el.dispatchEvent(new TouchEvent('touchmove', { touches: [t(y + moveY)], changedTouches: [t(y + moveY)], bubbles: true }));
  const moved = document.querySelector('.sheet').style.transform;
  el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(y + moveY)], bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true, clientX: x, clientY: y + moveY }));
  return moved;
}, { selector, moveY });

for (const ml of [90, 150, 210]) {
  const moved = await shakyTouch(`[data-quick="${ml}"]`, 6);
  assert.equal(moved, '', 'la ventana no debe moverse al tocar una cantidad');
  assert.equal(await page.inputValue('input[name="taken"]'), String(ml));
  assert.equal(await page.locator(`[data-quick="${ml}"]`).getAttribute('aria-pressed'), 'true');
}
step('Con el dedo moviéndose un poco, las cantidades 90, 150 y 210 ml se marcan y la ventana no se mueve');

// Un toque normal también funciona (y elegir dos veces lo mismo no suma)
await page.locator('[data-quick="120"]').tap();
assert.equal(await page.inputValue('input[name="taken"]'), '120');
step('Toque normal: 120 ml');

// Deslizar el cuerpo del formulario NO cierra; desde la rayita de arriba SÍ
await shakyTouch('.quick', 200);
assert.equal(await page.locator('.sheet-root').count(), 1);
step('Deslizar sobre las cantidades no cierra la ventana');
await shakyTouch('.grabber', 200);
await page.locator('.sheet-root').waitFor({ state: 'detached' });
step('Deslizar hacia abajo desde la rayita de arriba cierra la ventana');

assert.deepEqual(errors, []);
step('Sin errores de JavaScript');
await browser.close();
