import type { User } from '@supabase/supabase-js';
import { supabase } from './dbApi';
import type { AdminUser } from '../types.ts';

/**
 * Autenticación de administradores con Supabase Auth.
 * - La sesión real la guarda y renueva supabase-js (token de acceso + refresco automático).
 * - Aquí solo se añade la política operativa: cierre por inactividad y duración máxima.
 */
export const SESION = {
  /** Sin actividad (clics, teclado, scroll) durante este tiempo se cierra la sesión. */
  inactividadMs: 8 * 60 * 60 * 1000,
  /** Duración máxima desde el inicio de sesión, aunque haya actividad. */
  maximaMs: 12 * 60 * 60 * 1000,
};

const K_INICIO = 'amore_sesion_inicio';
const K_ACTIVIDAD = 'amore_ultima_actividad';
const K_NO_RECORDAR = 'amore_no_recordar';
const K_PESTANA = 'amore_sesion_pestana';

function leer(clave: string, almacen: Storage = localStorage): string | null {
  try { return almacen.getItem(clave); } catch { return null; }
}
function escribir(clave: string, valor: string, almacen: Storage = localStorage): void {
  try { almacen.setItem(clave, valor); } catch { /* almacenamiento bloqueado */ }
}
function borrar(clave: string, almacen: Storage = localStorage): void {
  try { almacen.removeItem(clave); } catch { /* almacenamiento bloqueado */ }
}

/** El rol sale de app_metadata (solo editable desde el servidor), nunca de user_metadata. */
function aAdminUser(u: User): AdminUser {
  const meta = (u.user_metadata || {}) as Record<string, unknown>;
  const rol = ((u.app_metadata || {}) as Record<string, unknown>).role;
  const nombre = (meta.name as string) || (meta.full_name as string) || (u.email || '').split('@')[0];
  return {
    id: u.id,
    email: u.email || '',
    name: nombre,
    role: typeof rol === 'string' && rol ? rol : 'admin',
    isActive: true,
    lastLogin: u.last_sign_in_at,
  };
}

function sesionExpirada(): boolean {
  const ahora = Date.now();
  const inicio = Number(leer(K_INICIO) || 0);
  const actividad = Number(leer(K_ACTIVIDAD) || 0);
  if (inicio && ahora - inicio > SESION.maximaMs) return true;
  if (actividad && ahora - actividad > SESION.inactividadMs) return true;
  return false;
}

export type ResultadoLogin =
  | { ok: true; user: AdminUser }
  | { ok: false; error: string; bloqueoSeg?: number };

export async function iniciarSesion(email: string, password: string, recordar: boolean): Promise<ResultadoLogin> {
  let respuesta;
  try {
    respuesta = await supabase.auth.signInWithPassword({ email, password });
  } catch {
    return { ok: false, error: 'No se pudo conectar. Revisa tu conexión a internet e inténtalo de nuevo.' };
  }
  const { data, error } = respuesta;
  if (error || !data.user) {
    const msg = (error?.message || '').toLowerCase();
    if (error?.status === 429 || msg.includes('rate limit')) {
      return { ok: false, error: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.', bloqueoSeg: 60 };
    }
    if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
      return { ok: false, error: 'Correo o contraseña incorrectos.' };
    }
    if (msg.includes('not confirmed')) {
      return { ok: false, error: 'Tu correo aún no está confirmado. Pide al administrador que active tu cuenta.' };
    }
    return { ok: false, error: 'No se pudo iniciar sesión. Inténtalo de nuevo.' };
  }

  const ahora = String(Date.now());
  escribir(K_INICIO, ahora);
  escribir(K_ACTIVIDAD, ahora);
  if (recordar) {
    borrar(K_NO_RECORDAR);
  } else {
    // Sin "recordar": la sesión no sobrevive al cierre del navegador
    escribir(K_NO_RECORDAR, '1');
    escribir(K_PESTANA, '1', sessionStorage);
  }
  return { ok: true, user: aAdminUser(data.user) };
}

export async function cerrarSesion(): Promise<void> {
  borrar(K_INICIO);
  borrar(K_ACTIVIDAD);
  borrar(K_NO_RECORDAR);
  borrar(K_PESTANA, sessionStorage);
  try { await supabase.auth.signOut(); } catch { /* sin conexión: la sesión local ya se limpió */ }
}

let restauracionEnCurso: Promise<AdminUser | null> | null = null;

/**
 * Al abrir la página: devuelve el admin si hay una sesión vigente; si no, null.
 * Las llamadas simultáneas (p. ej. React StrictMode en desarrollo) comparten una sola restauración.
 */
export function restaurarSesion(): Promise<AdminUser | null> {
  if (!restauracionEnCurso) {
    restauracionEnCurso = restaurarSesionInterna().finally(() => {
      restauracionEnCurso = null;
    });
  }
  return restauracionEnCurso;
}

async function restaurarSesionInterna(): Promise<AdminUser | null> {
  if (leer(K_NO_RECORDAR) === '1' && !leer(K_PESTANA, sessionStorage)) {
    await cerrarSesion();
    return null;
  }
  if (sesionExpirada()) {
    await cerrarSesion();
    return null;
  }
  let sesion;
  try {
    sesion = (await supabase.auth.getSession()).data.session;
  } catch {
    return null;
  }
  if (!sesion?.user) return null;
  if (!leer(K_INICIO)) escribir(K_INICIO, String(Date.now()));
  return aAdminUser(sesion.user);
}

/** Avisa cuando la sesión cambia (p. ej. se cerró desde otra pestaña). */
export function alCambiarSesion(cb: (user: AdminUser | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
    if (evento === 'SIGNED_OUT') {
      borrar(K_INICIO);
      borrar(K_ACTIVIDAD);
    }
    cb(sesion?.user ? aAdminUser(sesion.user) : null);
  });
  return () => data.subscription.unsubscribe();
}

/** Registra la actividad del usuario y cierra la sesión al superar los límites. */
export function vigilarActividad(alExpirar: () => void): () => void {
  const eventos: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
  let ultimo = 0;
  const tocar = () => {
    const ahora = Date.now();
    if (ahora - ultimo > 30_000) {
      ultimo = ahora;
      escribir(K_ACTIVIDAD, String(ahora));
    }
  };
  tocar();
  eventos.forEach((e) => window.addEventListener(e, tocar, { passive: true }));

  const revisar = () => { if (sesionExpirada()) alExpirar(); };
  const intervalo = window.setInterval(revisar, 60_000);
  const alVolver = () => { if (!document.hidden) revisar(); };
  document.addEventListener('visibilitychange', alVolver);

  return () => {
    eventos.forEach((e) => window.removeEventListener(e, tocar));
    window.clearInterval(intervalo);
    document.removeEventListener('visibilitychange', alVolver);
  };
}

// ---------------------------------------------------------------------------
// Recuperación de contraseña
// ---------------------------------------------------------------------------

/** Se evalúa al cargar el módulo: supabase-js consume el hash del enlace, así que lo anotamos antes. */
let recuperacionPendiente = false;
try {
  recuperacionPendiente = /type=recovery/.test(window.location.hash);
} catch { /* sin window */ }

export function hayRecuperacionPendiente(): boolean {
  return recuperacionPendiente;
}

export function terminarRecuperacion(): void {
  recuperacionPendiente = false;
}

/** Envía el correo de recuperación. La respuesta es genérica para no revelar si el correo existe. */
export async function enviarRecuperacion(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (error && (error.status === 429 || /rate limit/i.test(error.message))) {
      return { ok: false, error: 'Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo conectar. Revisa tu conexión a internet.' };
  }
}

/** Define la nueva contraseña del usuario con la sesión de recuperación activa. */
export async function cambiarClave(nueva: string): Promise<{ ok: boolean; error?: string }> {
  if (nueva.length < 8) return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
  try {
    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) {
      if (/same password|different from the old/i.test(error.message)) {
        return { ok: false, error: 'La nueva contraseña debe ser distinta de la anterior.' };
      }
      return { ok: false, error: 'No se pudo cambiar la contraseña. El enlace pudo haber vencido: solicita uno nuevo.' };
    }
    const ahora = String(Date.now());
    escribir(K_INICIO, ahora);
    escribir(K_ACTIVIDAD, ahora);
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo conectar. Revisa tu conexión a internet.' };
  }
}
