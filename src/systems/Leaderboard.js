// Tabla de tiempos en Firestore, con sesión anónima de Firebase Auth.
//
// Solo se importan app, auth y firestore (nada de Analytics). Nada de aquí lanza errores: cada función
// devuelve { ok: true, ... } o { ok: false, error }, y el juego sigue igual sin conexión.
//
// Sin conexión, Firestore no falla enseguida: addDoc deja la escritura en cola y su promesa queda pendiente
// hasta que el servidor confirma. Por eso todo lleva un tiempo máximo (TIMEOUT_MS). Y para no duplicar el
// tiempo al reintentar, submitScore recibe una `key` (una por partida terminada): si ya hay un envío en curso
// con esa key, se espera ese mismo en vez de mandar otro.
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  where,
  getDocsFromServer,
  getCountFromServer,
} from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase.js';
import { LEADERBOARD } from '../config/constants.js';

const COLLECTION = 'scores';
const TIMEOUT_MS = 8000;
// Límites que exigen las reglas (validar aquí ahorra un viaje al servidor que igual se rechazaría).
const NAME_MAX = 12;

let auth = null;
let db = null;
let signIn = null; // promesa del último intento de sesión anónima
const inflight = new Map(); // key → promesa cruda de addDoc (ver arriba)

// La promesa original sigue viva aunque gane el timeout: solo dejamos de esperarla.
const withTimeout = (promise, ms = TIMEOUT_MS) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

const fail = (error) => {
  console.warn('[Leaderboard]', error?.code ?? '', error?.message ?? error);
  return { ok: false, error };
};

function trySignIn() {
  signIn = signInAnonymously(auth).then(
    () => ({ ok: true }),
    (error) => fail(error),
  );
  return signIn;
}

// Hay sesión, o se intenta de nuevo (si arrancó sin internet, el primer intento falló).
async function ensureAuth() {
  if (!auth) return fail(new Error('Firebase no inicializado'));
  if (auth.currentUser) return { ok: true };
  const first = await withTimeout(signIn ?? trySignIn()).catch(fail);
  if (auth.currentUser) return { ok: true };
  if (first.ok === false && first.error?.message !== 'timeout') {
    const again = await withTimeout(trySignIn()).catch(fail);
    if (auth.currentUser) return { ok: true };
    return again.ok ? fail(new Error('sin sesión')) : again;
  }
  return fail(first.error ?? new Error('sin sesión'));
}

export const Leaderboard = {
  // Al arrancar el juego. No se espera: la sesión llega sola en segundo plano.
  init() {
    try {
      const app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      trySignIn();
      return { ok: true };
    } catch (error) {
      return fail(error);
    }
  },

  // Guarda un tiempo. Devuelve { ok, id } con el id del documento creado.
  // `key` (opcional): identifica la partida; reintentar con la misma key no crea un segundo documento.
  async submitScore({ name, character, timeMs, deaths }, key) {
    try {
      const clean = {
        name: String(name ?? '').trim(),
        character: String(character ?? ''),
        timeMs: Math.round(timeMs),
        deaths: Math.max(0, Math.round(deaths ?? 0)),
      };
      // Datos que las reglas rechazarían: no se manda nada y se marca `invalid` (reintentar no sirve).
      if (clean.name.length < 1 || clean.name.length > NAME_MAX) return { ...fail(new Error(`nombre inválido: "${clean.name}"`)), invalid: true };
      const { minTimeMs, maxTimeMs } = LEADERBOARD;
      if (!(clean.timeMs >= minTimeMs && clean.timeMs <= maxTimeMs)) {
        return { ...fail(new Error(`tiempo fuera de rango (${clean.timeMs} ms; debe estar entre ${minTimeMs} y ${maxTimeMs})`)), invalid: true };
      }
      const session = await ensureAuth();
      if (!session.ok) return session;

      let pending = key != null ? inflight.get(key) : null;
      if (!pending) {
        // EXACTAMENTE los campos que aceptan las reglas.
        pending = addDoc(collection(db, COLLECTION), { ...clean, uid: auth.currentUser.uid, createdAt: serverTimestamp() });
        // Si falla de verdad (no por timeout), se olvida para que el reintento mande uno nuevo.
        pending.catch(() => key != null && inflight.delete(key));
        if (key != null) inflight.set(key, pending);
      }
      const ref = await withTimeout(pending);
      return { ok: true, id: ref.id };
    } catch (error) {
      return fail(error);
    }
  },

  // Los n mejores tiempos (menor primero). Del servidor siempre: desde la caché, sin conexión, saldría vacía
  // en vez de fallar. Cada fila: { id, name, character, timeMs, deaths }.
  async getTop(n = 10) {
    try {
      const session = await ensureAuth();
      if (!session.ok) return session;
      const snap = await withTimeout(getDocsFromServer(query(collection(db, COLLECTION), orderBy('timeMs', 'asc'), limit(n))));
      return { ok: true, rows: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
    } catch (error) {
      return fail(error);
    }
  },

  // Puesto de un tiempo: cuántos son estrictamente más rápidos, más 1 (los empates comparten puesto).
  async getRank(timeMs) {
    try {
      const session = await ensureAuth();
      if (!session.ok) return session;
      const snap = await withTimeout(getCountFromServer(query(collection(db, COLLECTION), where('timeMs', '<', Math.round(timeMs)))));
      return { ok: true, rank: snap.data().count + 1 };
    } catch (error) {
      return fail(error);
    }
  },

  async getTotal() {
    try {
      const session = await ensureAuth();
      if (!session.ok) return session;
      const snap = await withTimeout(getCountFromServer(collection(db, COLLECTION)));
      return { ok: true, total: snap.data().count };
    } catch (error) {
      return fail(error);
    }
  },
};
