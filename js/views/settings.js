// AJUSTES: personalización, datos (CSV / copia / restaurar / borrar) y privacidad.
import { store, TYPES } from '../store.js';
import { icons, logo, paw } from '../art.js';
import { openSheet, confirmDialog, toast, esc, $ } from '../ui.js';
import { toCSV, toBackup, parseBackup, mergeRecords } from '../data-io.js';
import { dayKey } from '../dates.js';

export const APP_VERSION = '1.0.0';

const INTERVALS = [[0, 'Sin referencia'], [120, 'Cada 2 h'], [150, 'Cada 2 h 30'], [180, 'Cada 3 h'], [210, 'Cada 3 h 30'], [240, 'Cada 4 h']];

/** Comparte el archivo (hoja de compartir de iOS) o, si no se puede, lo descarga. */
async function deliverFile(name, content, type) {
  // Dentro de claude.ai las descargas pasan por la capacidad `downloads`.
  if (typeof globalThis.claude?.use === 'function') {
    const dl = await globalThis.claude.use('downloads').catch(() => null);
    if (!dl) { toast('Las descargas no están disponibles aquí'); return false; }
    try { await dl.save({ filename: name, data: content }); return true; }
    catch (e) { if (e?.code !== 'declined') toast('No se pudo preparar el archivo'); return false; }
  }
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return true; }
    catch (e) { if (e.name === 'AbortError') return false; }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}

export function openSettings() {
  let unsub;
  openSheet({
    label: 'Ajustes',
    onClose: () => unsub?.(),
    render(body) {
      const draw = () => {
        const s = store.settings;
        const nB = store.all('bottles').length, nP = store.all('poops').length;
        const cloud = store.backend === 'cloud';
        const backendLabel = { cloud: 'En la nube, en tu cuenta de Claude', indexeddb: 'En este dispositivo (IndexedDB)', localstorage: 'En este dispositivo (almacenamiento local)', memory: 'Temporal: este navegador no permite guardar' }[store.backend];
        body.innerHTML = `
        <div class="sheet-head">
          <h2 class="h-section">Ajustes</h2>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icons.close()}</button>
        </div>

        <div class="eyebrow" style="margin-top:6px">Personal</div>
        <div class="settings-group">
          <label class="settings-row"><span class="ico">${icons.heart({ size: 18 })}</span><span class="grow">Nombre del bebé</span>
            <input type="text" name="babyName" value="${esc(s.babyName)}" maxlength="24" autocapitalize="words" enterkeyhint="done"></label>
        </div>

        <div class="eyebrow" style="margin-top:22px">Biberones</div>
        <div class="settings-group">
          <label class="settings-row"><span class="ico">${icons.clock({ size: 18 })}</span>
            <span class="grow">Próximo biberón<br><span class="subtle">Referencia orientativa desde la última toma</span></span>
            <select name="interval">${INTERVALS.map(([v, l]) => `<option value="${v}" ${s.nextIntervalMin === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <div style="padding:14px 16px 0"><div>Cantidades rápidas</div><div class="subtle">Atajos del formulario. Personalízalos a tu gusto; no son una recomendación.</div></div>
          <div class="amount-chips">${[...s.quickAmounts].sort((a, b) => a - b).map((v) => `<span class="chip">${v} ml<button type="button" data-rm-amount="${v}" aria-label="Quitar ${v} ml">${icons.close({ size: 14 })}</button></span>`).join('')}</div>
          <div class="add-amount"><input type="number" inputmode="numeric" pattern="[0-9]*" min="5" max="1000" placeholder="Nueva cantidad en ml" name="newAmount" aria-label="Nueva cantidad rápida">
            <button type="button" class="btn btn-ghost btn-sm" data-add-amount>Añadir</button></div>
        </div>

        <div class="eyebrow" style="margin-top:22px">Tus datos · ${nB} biberones, ${nP} deposiciones</div>
        <div class="settings-group">
          <button class="settings-row" data-export="csv"><span class="ico">${icons.download({ size: 18 })}</span><span class="grow">Exportar registros (CSV)<br><span class="subtle">Para abrir en Numbers o Excel</span></span>${icons.right({ size: 16 })}</button>
          <button class="settings-row" data-export="json"><span class="ico">${icons.shield({ size: 18 })}</span><span class="grow">Crear copia de seguridad<br><span class="subtle">Archivo .json que puedes guardar en Archivos o iCloud Drive</span></span>${icons.right({ size: 16 })}</button>
          <label class="settings-row"><span class="ico">${icons.upload({ size: 18 })}</span><span class="grow">Restaurar copia de seguridad<br><span class="subtle">Se combina con lo actual, sin duplicados</span></span>${icons.right({ size: 16 })}
            <input type="file" accept="application/json,.json" name="restore" class="sr-only"></label>
          <button class="settings-row danger" data-wipe><span class="ico">${icons.trash({ size: 18 })}</span><span class="grow">Borrar todos los registros</span></button>
        </div>

        <div class="eyebrow" style="margin-top:22px">Privacidad</div>
        <div class="card prose" style="margin-top:10px">
          ${cloud ? `<p><strong>Tus registros se guardan en la nube, dentro de esta página privada de claude.ai.</strong> Puedes abrirla desde cualquier dispositivo con tu cuenta de Claude, y los cambios se sincronizan al momento.</p>
          <p>Solo tú tienes acceso, salvo que la compartas desde el menú Compartir. Para que otra persona (por ejemplo, la otra mamá o el otro papá) pueda registrar, compártela con ella como Colaborador o Editor.</p>
          <p>Nia CV no tiene analíticas ni publicidad y no envía tus datos a ningún otro servicio. Los registros solo salen de aquí si exportas un CSV o una copia de seguridad.</p>
          <p>Necesita conexión a Internet. Si borras esta página de claude.ai, se borran también sus registros: haz copias de seguridad de vez en cuando.</p>` : `<p><strong>Tus registros no salen de este iPhone.</strong> Nia CV no tiene cuentas, servidores, analíticas ni publicidad, y no envía datos a terceros.</p>
          <p>Se guardan en el almacenamiento privado de la app en este dispositivo: ${esc(backendLabel)}${store.persisted ? ', marcado como persistente' : ''}. Funcionan sin conexión.</p>
          <p>Sólo salen del dispositivo si tú exportas un CSV o una copia de seguridad y decides dónde guardarla o con quién compartirla.</p>
          <p>Si borras la app de la pantalla de inicio o los datos del sitio en Safari, los registros se eliminan. Haz copias de seguridad de vez en cuando.</p>
          <h4>Sincronización</h4>
          <p>Esta versión no sincroniza. Los datos ya usan identificadores únicos y fecha de modificación para poder sincronizarse de forma segura en el futuro, siempre con tu autorización explícita.</p>`}
        </div>

        <div class="foot">${logo()}<div>Versión ${APP_VERSION} · Hecho con cariño ${paw(10)}</div>
          <div style="margin-top:4px">Ilustraciones originales. Tipografías Cormorant Garamond y DM Sans (SIL OFL).</div></div>`;
      };
      draw();
      unsub = store.subscribe(draw);

      body.addEventListener('change', async (e) => {
        const t = e.target;
        if (t.name === 'babyName') {
          await store.updateSettings({ babyName: t.value.trim() || 'Nia' });
          toast('Nombre actualizado');
        }
        if (t.name === 'interval') await store.updateSettings({ nextIntervalMin: Number(t.value) });
        if (t.name === 'restore' && t.files?.[0]) await restore(t.files[0]);
      });

      body.addEventListener('click', async (e) => {
        const rm = e.target.closest('[data-rm-amount]');
        if (rm) {
          const v = Number(rm.dataset.rmAmount);
          if (store.settings.quickAmounts.length <= 1) return toast('Deja al menos una cantidad');
          return store.updateSettings({ quickAmounts: store.settings.quickAmounts.filter((x) => x !== v) });
        }
        if (e.target.closest('[data-add-amount]')) {
          const input = $('[name="newAmount"]', body);
          const v = Math.round(Number(input.value));
          if (!v || v < 5 || v > 1000) return toast('Escribe una cantidad entre 5 y 1000 ml');
          if (store.settings.quickAmounts.includes(v)) return toast('Esa cantidad ya existe');
          if (store.settings.quickAmounts.length >= 12) return toast('Máximo 12 cantidades rápidas');
          return store.updateSettings({ quickAmounts: [...store.settings.quickAmounts, v] });
        }
        const ex = e.target.closest('[data-export]');
        if (ex) {
          const stamp = dayKey();
          if (ex.dataset.export === 'csv') {
            const ok = await deliverFile(`nia-cv-registros-${stamp}.csv`, toCSV(store.all('bottles'), store.all('poops')), 'text/csv;charset=utf-8');
            if (ok) toast('CSV preparado');
          } else {
            const data = toBackup({ bottles: store.all('bottles'), poops: store.all('poops'), settings: store.settings });
            const ok = await deliverFile(`nia-cv-copia-${stamp}.json`, JSON.stringify(data, null, 2), 'application/json');
            if (ok) toast('Copia de seguridad creada');
          }
          return;
        }
        if (e.target.closest('[data-wipe]')) {
          const ok = await confirmDialog({
            title: '¿Borrar todos los registros?',
            message: 'Se eliminarán todos los biberones y deposiciones de este dispositivo. Esta acción no se puede deshacer. Te recomendamos crear antes una copia de seguridad.',
            confirmLabel: 'Borrar todo',
          });
          if (!ok) return;
          await store.clearAll();
          toast('Registros borrados');
        }
      });

      async function restore(file) {
        try {
          const data = parseBackup(await file.text());
          const ok = await confirmDialog({
            title: 'Restaurar copia',
            message: `La copia contiene ${data.bottles.length} biberones y ${data.poops.length} deposiciones. Se combinarán con los registros actuales sin duplicarlos.`,
            confirmLabel: 'Restaurar', danger: false,
          });
          if (!ok) return;
          let added = 0, updated = 0;
          for (const t of TYPES) {
            const r = mergeRecords(store.all(t), data[t]);
            added += r.added; updated += r.updated;
            await store.replaceAll(t, r.merged);
          }
          store.emit();
          toast(`Copia restaurada · ${added} nuevos, ${updated} actualizados`);
        } catch (err) {
          toast(err.message || 'No se pudo leer el archivo');
        }
      }
    },
  });
}
