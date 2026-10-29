// AJUSTES: personalización, datos (CSV / copia / restaurar / borrar) y privacidad.
import { store, TYPES } from '../store.js';
import { icons, logo, paw } from '../art.js';
import { openSheet, confirmDialog, toast, esc, $ } from '../ui.js';
import { toCSV, toBackup, parseBackup, mergeRecords } from '../data-io.js';
import { dayKey } from '../dates.js';
import { signOut } from '../account.js';
import { syncLabel } from './common.js';
import { THEMES, getTheme, setTheme } from '../theme.js';
import { pupIcon } from '../characters.js';

export const APP_VERSION = '1.5.0';

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
    render(body, close) {
      const draw = () => {
        const s = store.settings;
        const nB = store.all('bottles').length, nP = store.all('poops').length;
        const cloud = store.backend === 'cloud';
        const backendLabel = { cloud: 'En la nube, en tu cuenta de Claude', indexeddb: 'En este dispositivo (base de datos del navegador)', localstorage: 'En este dispositivo (almacenamiento local)', memory: 'Temporal: este navegador no permite guardar' }[store.backend];
        body.innerHTML = `
        <div class="sheet-head">
          <h2 class="h-section">Ajustes</h2>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icons.close()}</button>
        </div>

        ${store.backend === 'supabase' ? `<div class="eyebrow" style="margin-top:6px">Cuenta</div>
        <div class="settings-group">
          <div class="settings-row"><span class="ico">${icons.shield({ size: 18 })}</span><span class="grow">${esc(store.account || '')}<br><span class="subtle">${esc(syncLabel(store.sync).long)}</span></span></div>
          <button class="settings-row" data-sync-now><span class="ico">${icons.upload({ size: 18 })}</span><span class="grow">Sincronizar ahora</span></button>
          <button class="settings-row danger" data-signout><span class="ico">${icons.close({ size: 18 })}</span><span class="grow">Cerrar sesión</span></button>
        </div>
        <div style="margin-top:22px"></div>` : ''}
        <div class="eyebrow" style="margin-top:6px">Apariencia</div>
        <div class="settings-group">
          <div class="settings-row" style="flex-direction:column;align-items:stretch;gap:10px">
            <span style="display:flex;align-items:center;gap:14px"><span class="ico">${getTheme() === 'dark' ? icons.moon({ size: 18 }) : icons.sun({ size: 18 })}</span>
              <span class="grow">Modo de color<br><span class="subtle">${getTheme() === 'auto' ? 'Sigue el modo claro u oscuro del dispositivo' : 'Solo en este dispositivo'}</span></span></span>
            <div class="segmented" role="radiogroup" aria-label="Modo de color">
              ${THEMES.map(([v, l]) => `<button type="button" role="radio" aria-checked="${getTheme() === v}" class="${getTheme() === v ? 'on' : ''}" data-theme-pick="${v}">${l}</button>`).join('')}
            </div>
          </div>
        </div>

        <div class="eyebrow" style="margin-top:22px">Datos de ${esc(s.babyName || 'Nia')}</div>
        <div class="settings-group">
          <button class="settings-row" data-go-profile><span class="ico">${icons.heart({ size: 18 })}</span>
            <span class="grow">Datos personales, foto y álbum<br><span class="subtle">En la pestaña ${esc((s.babyName || 'Nia').split(' ')[0])}, abajo a la derecha</span></span>${icons.right({ size: 16 })}</button>
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
          ${store.backend === 'supabase' ? `<p><strong>Tus registros se guardan primero en este dispositivo y después en la nube (Supabase), en tu cuenta.</strong> Puedes entrar desde cualquier móvil, tablet u ordenador con tu correo y contraseña.</p>
          <p>Si no hay conexión, lo que registres queda guardado aquí y se sube solo en cuanto vuelva la red. El indicador de la pantalla Hoy te dice si todo está en la nube.</p>
          <p>La base de datos aplica reglas de seguridad: cada cuenta solo puede leer y modificar sus propios registros. La conexión va cifrada (HTTPS). Nia CV no tiene analíticas ni publicidad y no comparte tus datos con nadie.</p>
          <p>Los datos personales (nacimiento, grupo sanguíneo, talla), la foto y el álbum también se guardan en tu cuenta, con fotos reducidas, para que los veas en todos tus dispositivos.</p>
          <p>Al cerrar sesión se borra la copia de este dispositivo; los datos siguen en tu cuenta.</p>` : cloud ? `<p><strong>Tus registros se guardan en la nube, dentro de esta página privada de claude.ai.</strong> Puedes abrirla desde cualquier dispositivo con tu cuenta de Claude, y los cambios se sincronizan al momento.</p>
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
          <div style="margin-top:4px">Ilustraciones originales: Nube, Canela, Mamá y Papá son personajes propios de Nia CV. Tipografías Cormorant Garamond y DM Sans (SIL OFL).</div></div>`;
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
            const data = toBackup({ bottles: store.all('bottles'), poops: store.all('poops'), album: store.all('album'), settings: store.settings });
            const ok = await deliverFile(`nia-cv-copia-${stamp}.json`, JSON.stringify(data, null, 2), 'application/json');
            if (ok) toast('Copia de seguridad creada');
          }
          return;
        }
        const pick = e.target.closest('[data-theme-pick]');
        if (pick) {
          setTheme(pick.dataset.themePick);
          store.emit(); // vuelve a dibujar Ajustes y la pantalla de fondo
          return toast({ auto: 'Modo automático', light: 'Modo claro', dark: 'Modo oscuro' }[pick.dataset.themePick]);
        }
        if (e.target.closest('[data-go-profile]')) { close(); location.hash = 'nia'; return; }
        if (e.target.closest('[data-signout]')) return signOut();
        if (e.target.closest('[data-sync-now]')) {
          await store.adapter.pull();
          return toast(store.sync?.error ? 'Sin conexión: se reintentará solo' : 'Todo sincronizado');
        }
        if (e.target.closest('[data-wipe]')) {
          const ok = await confirmDialog({
            title: '¿Borrar todos los registros?',
            message: (store.backend === 'supabase' ? 'Se eliminarán todos los biberones y deposiciones de tu cuenta, en todos los dispositivos.' : 'Se eliminarán todos los biberones y deposiciones de este dispositivo.') + ' El álbum y los datos de Nia no se borran. Esta acción no se puede deshacer. Te recomendamos crear antes una copia de seguridad.',
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
            message: `La copia contiene ${data.bottles.length} biberones, ${data.poops.length} deposiciones y ${data.album.length} fotos del álbum. Se combinarán con los registros actuales sin duplicarlos.`,
            confirmLabel: 'Restaurar', danger: false,
          });
          if (!ok) return;
          let added = 0, updated = 0;
          for (const t of TYPES) {
            const r = mergeRecords(store.all(t), data[t] || []);
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
