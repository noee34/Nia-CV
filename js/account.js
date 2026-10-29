// Sesión actual (modo cuenta con Supabase). La comparten app.js y Ajustes.
import { store } from './store.js';
import { confirmDialog } from './ui.js';

export const account = { client: null, user: null };
export const LAST_USER = 'nia-cv:last-user';

/** Cerrar sesión (lo usa Ajustes). Borra la copia local de esta cuenta. */
export async function signOut() {
  const pending = store.sync?.pending || 0;
  if (pending) {
    const ok = await confirmDialog({
      title: 'Hay cambios sin subir',
      message: `${pending} ${pending === 1 ? 'cambio no se ha' : 'cambios no se han'} subido todavía a la nube porque no hay conexión. Si cierras la sesión ahora, se perderán.`,
      confirmLabel: 'Cerrar sesión igualmente',
    });
    if (!ok) return;
  }
  try { await account.client.auth.signOut(); } catch (e) { console.warn(e); }
  try { localStorage.removeItem(LAST_USER); } catch { /* nada */ }
  try { store.adapter?.local?.db?.close(); indexedDB.deleteDatabase(`nia-cv-${account.user.id}`); } catch { /* nada */ }
  location.replace(location.pathname);
}

