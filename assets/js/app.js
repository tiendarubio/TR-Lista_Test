// app.js — Helpers para TRLista + Auth/Roles (Vercel)

let CATALOGO_CACHE = null;

function preloadCatalog() {
  if (CATALOGO_CACHE) return Promise.resolve(CATALOGO_CACHE);

  return fetch('/api/catalogo')
    .then(r => {
      if (!r.ok) throw new Error('Error catálogo: ' + r.statusText);
      return r.json();
    })
    .then(data => {
      CATALOGO_CACHE = Array.isArray(data.values) ? data.values : [];
      try { window.CATALOGO_CACHE = CATALOGO_CACHE; } catch (_) {}
      return CATALOGO_CACHE;
    })
    .catch(e => {
      console.error('Sheets catálogo error:', e);
      CATALOGO_CACHE = [];
      try { window.CATALOGO_CACHE = CATALOGO_CACHE; } catch (_) {}
      return CATALOGO_CACHE;
    });
}

function loadProductsFromGoogleSheets() { return preloadCatalog(); }

function getTodayString() { return new Date().toISOString().split('T')[0]; }

function formatSV(iso) {
  if (!iso) return 'Aún no guardado.';
  try {
    const dt = new Date(iso);
    return dt.toLocaleString('es-SV', {
      timeZone: 'America/El_Salvador',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return 'Aún no guardado.';
  }
}

window.CURRENT_USER = null;

function getAuth() {
  if (typeof firebase === 'undefined' || !firebase.auth) return null;
  return firebase.auth();
}

function getDb() {
  if (typeof firebase === 'undefined' || !firebase.firestore) return null;
  return firebase.firestore();
}

async function loadUserProfile(uid) {
  const db = getDb();
  if (!db) throw new Error('Firestore no disponible');
  const snap = await db.collection('users').doc(String(uid)).get();
  if (!snap.exists) return null;
  return snap.data() || null;
}

function storeListId(storeKey, versionKey) {
  const s = String(storeKey || '').trim();
  const v = String(versionKey || 'base').trim();
  return s + '__' + v;
}

// APORTES POR USUARIO (sin choques):
// tr_lista_aportes/{storeKey__versionKey}/usuarios/{uid}/historial/{YYYY-MM-DD}
function saveUserChecklistToFirestore(storeKey, versionKey, uid, payload, dateStr) {
  if (!storeKey) return Promise.reject(new Error('storeKey requerido'));
  if (!uid) return Promise.reject(new Error('uid requerido'));
  const db = getDb();
  if (!db) return Promise.reject(new Error('Firestore no disponible'));

  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();
  const slId = storeListId(storeKey, versionKey);

  const safePayload = payload || {};
  safePayload.meta = safePayload.meta || {};
  safePayload.meta.storeKey = storeKey;
  safePayload.meta.versionKey = versionKey || 'base';
  safePayload.meta.storeListId = slId;
  safePayload.meta.updatedAt = new Date().toISOString();
  safePayload.meta.updatedBy = String(uid);

  return db
    .collection('tr_lista_aportes')
    .doc(slId)
    .collection('usuarios')
    .doc(String(uid))
    .collection('historial')
    .doc(day)
    .set(safePayload, { merge: true })
    .then(() => ({ ok: true, day }));
}

function loadUserChecklistFromFirestore(storeKey, versionKey, uid, dateStr) {
  if (!storeKey || !uid) return Promise.resolve({});
  const db = getDb();
  if (!db) return Promise.reject(new Error('Firestore no disponible'));

  const day = (typeof dateStr === 'string' && dateStr) ? dateStr : getTodayString();
  const slId = storeListId(storeKey, versionKey);

  return db
    .collection('tr_lista_aportes')
    .doc(slId)
    .collection('usuarios')
    .doc(String(uid))
    .collection('historial')
    .doc(day)
    .get()
    .then(doc => (doc.exists ? (doc.data() || {}) : {}))
    .catch(err => {
      console.error('Error al leer aportes:', err);
      return {};
    });
}

function getUserHistoryDates(storeKey, versionKey, uid) {
  if (!storeKey || !uid) return Promise.resolve([]);
  const db = getDb();
  if (!db) return Promise.reject(new Error('Firestore no disponible'));

  const slId = storeListId(storeKey, versionKey);

  return db
    .collection('tr_lista_aportes')
    .doc(slId)
    .collection('usuarios')
    .doc(String(uid))
    .collection('historial')
    .get()
    .then(snap => snap.docs.map(d => d.id))
    .catch(err => {
      console.error('Error al listar historial (usuario):', err);
      return [];
    });
}
