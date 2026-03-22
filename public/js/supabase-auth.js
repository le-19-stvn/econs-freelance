/**
 * Supabase Auth Client — gestion de session côté frontend
 * Clés hardcodées (identiques à login.html)
 *
 * IMPORTANT : on utilise onAuthStateChange + INITIAL_SESSION
 * pour attendre que le client ait RÉELLEMENT chargé la session
 * depuis localStorage, sinon → redirect loop.
 */

const SUPABASE_URL = 'https://witaufezvdbjuweqgnzn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdGF1ZmV6dmRianV3ZXFnbnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTQwNzAsImV4cCI6MjA4OTc3MDA3MH0.lhI0QkWxZTFgW2TUzpHzyaSeONULBrEGYJY40R9DJ34';

const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Promesse résolue une seule fois quand l'état auth initial est connu
let _initialSessionReady;
const _sessionLoaded = new Promise((resolve) => {
  _initialSessionReady = resolve;
});

// Écoute le tout premier événement auth (INITIAL_SESSION)
const { data: { subscription: _authSub } } = _sb.auth.onAuthStateChange((event, session) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    _initialSessionReady(session);
    // On ne se désinscrit PAS pour capturer les futurs changements si besoin
  }
});

/**
 * Attend que la session initiale soit chargée, puis retourne le token.
 * Ne redirige PAS ici — c'est requireSession() qui décide.
 */
async function getAuthToken() {
  const session = await _sessionLoaded;
  if (!session) return null;
  // Rafraîchir le token si besoin (getSession retourne le token à jour)
  try {
    const { data: { session: fresh } } = await _sb.auth.getSession();
    return fresh ? fresh.access_token : null;
  } catch (e) {
    return session.access_token; // fallback sur le token initial
  }
}

/**
 * Retourne les infos du user connecté.
 */
async function getCurrentUser() {
  try {
    const { data: { user } } = await _sb.auth.getUser();
    return user;
  } catch (e) {
    return null;
  }
}

/**
 * Déconnexion.
 */
async function signOut() {
  try {
    await _sb.auth.signOut();
  } catch (e) {
    console.error('Erreur déconnexion:', e);
  }
  window.location.href = '/login.html';
}

/**
 * Vérifie que l'utilisateur est connecté, sinon redirige.
 * Attend la promesse _sessionLoaded pour ne pas redirecter trop tôt.
 */
async function requireSession() {
  const session = await _sessionLoaded;
  if (!session) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}
