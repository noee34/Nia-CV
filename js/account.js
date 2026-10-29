// Sesión actual (modo cuenta con Supabase) y diario compartido en familia.
// La comparten app.js, la pantalla de acceso y Ajustes.
import { store } from './store.js';
import { confirmDialog } from './ui.js';

export const account = { client: null, user: null, family: null };
export const LAST_USER = 'nia-cv:last-user';
const REMEMBER = 'nia-cv:remember';
const PENDING_INVITE = 'nia-cv:pending-invite';

/* ------------------------------------------------------------------ */
/* Mantener la sesión iniciada                                          */
/* ------------------------------------------------------------------ */

/** true = recordar la sesión en este dispositivo (opción por defecto). */
export function getRemember() {
  try { return localStorage.getItem(REMEMBER) !== '0'; } catch { return true; }
}
export function setRemember(on) {
  try { localStorage.setItem(REMEMBER, on ? '1' : '0'); } catch { /* sin almacenamiento */ }
}

/**
 * Dónde guarda Supabase la sesión. Si se mantiene iniciada, en el almacenamiento
 * permanente del dispositivo; si no, en uno temporal que el iPhone borra al
 * cerrar la app (y habrá que volver a entrar).
 */
export const sessionStorageAdapter = {
  getItem(k) {
    try { return localStorage.getItem(k) ?? sessionStorage.getItem(k); } catch { return null; }
  },
  setItem(k, v) {
    try {
      if (getRemember()) { localStorage.setItem(k, v); sessionStorage.removeItem(k); }
      else { sessionStorage.setItem(k, v); localStorage.removeItem(k); }
    } catch { /* sin almacenamiento */ }
  },
  removeItem(k) {
    try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch { /* nada */ }
  },
};

/* ------------------------------------------------------------------ */
/* Familia: compartir el diario con la pareja                           */
/* ------------------------------------------------------------------ */

const rpc = async (name, args) => {
  const { data, error } = await account.client.rpc(name, args);
  if (error) throw new Error(error.message || 'No se ha podido completar.');
  return data;
};

/** { propietario, propietario_correo, miembros: [{ id, correo }] } */
export const familyInfo = () => rpc('mi_familia_info');
export const createInvite = () => rpc('crear_invitacion');
export const joinFamily = (code) => rpc('unirse_a_familia', { p_codigo: code.trim().toUpperCase() });
export const leaveFamily = () => rpc('salir_de_familia');
export const removeMember = (id) => rpc('quitar_de_familia', { p_miembro: id });

/** ¿Es la persona que creó el diario? */
export const isOwner = () => !account.family || account.family.propietario === account.user?.id;

/** Código que hay que aplicar al entrar (cuenta recién creada que debía confirmar el correo). */
export function setPendingInvite(code) {
  try { if (code) localStorage.setItem(PENDING_INVITE, code.trim().toUpperCase()); else localStorage.removeItem(PENDING_INVITE); } catch { /* nada */ }
}
export function getPendingInvite() {
  try { return localStorage.getItem(PENDING_INVITE) || ''; } catch { return ''; }
}

/** Nombre de la copia local: la de siempre si es tu diario; otra si es el de tu familia. */
export const localDbName = (userId, familyId) => (familyId && familyId !== userId ? `nia-cv-${userId}-f-${familyId}` : `nia-cv-${userId}`);

/* ------------------------------------------------------------------ */
/* Cerrar sesión                                                        */
/* ------------------------------------------------------------------ */

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
  try {
    store.adapter?.local?.db?.close();
    indexedDB.deleteDatabase(localDbName(account.user.id, account.family?.propietario));
  } catch { /* nada */ }
  location.replace(location.pathname);
}

/** Tras unirse o salir de una familia: se vuelve a abrir la app con el diario nuevo. */
export function restartApp() {
  location.replace(location.pathname + '#hoy');
  location.reload();
}
