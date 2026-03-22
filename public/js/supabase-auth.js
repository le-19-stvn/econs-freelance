/**
 * Supabase Auth Client — gestion de session côté frontend
 * Clés hardcodées (identiques à login.html)
 *
 * IMPORTANT : on utilise onAuthStateChange + INITIAL_SESSION
 * pour attendre que le client ait RÉELLEMENT chargé la session
 * depuis localStorage, sinon → redirect loop.
 */

const SUPABASE_URL = 'https://yubhmmeskhcerrwcthyi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YmhtbWVza2hjZXJyd2N0aHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzM5NjMsImV4cCI6MjA4OTcwOTk2M30.BonoQ5HYPnPu8ewLZaeXxjT9HdBv3zBjZoPzZXFW-Rk';

const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Promesse résolue une seule fois quand l'état auth initial est connu
let _initialSessionReady;
const _sessionLoaded = new Promise((resolve) => {
  _initialSessionReady = resolve;
});

// Flag pour n'appeler resolve() qu'une seule fois
let _resolved = false;

// Écoute le tout premier événement auth (INITIAL_SESSION)
_sb.auth.onAuthStateChange((event, session) => {
  console.log('🔐 Auth event:', event, session ? '(session ✅)' : '(pas de session ❌)');
  if (!_resolved) {
    _resolved = true;
    _initialSessionReady(session);
  }
});

/**
 * Attend que la session initiale soit chargée, puis retourne le token.
 * Ne redirige JAMAIS — c'est requireSession() qui redirige si besoin.
 */
async function getAuthToken() {
  const session = await _sessionLoaded;
  if (!session) {
    console.warn('⚠️ getAuthToken(): pas de session');
    return null;
  }
  // Rafraîchir le token si besoin
  try {
    const { data: { session: fresh } } = await _sb.auth.getSession();
    const token = fresh ? fresh.access_token : session.access_token;
    console.log('🔑 Token prêt :', token ? token.substring(0, 10) + '...' : 'null');
    return token;
  } catch (e) {
    console.warn('⚠️ Erreur refresh token, fallback');
    return session.access_token;
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
 * C'est LE SEUL ENDROIT qui redirige vers login.html.
 */
async function requireSession() {
  console.log('🛡️ requireSession() — attente du chargement...');
  const session = await _sessionLoaded;
  if (!session) {
    console.log('🛡️ Pas de session → redirection login.html');
    window.location.href = '/login.html';
    return false;
  }
  console.log('🛡️ Session OK pour :', session.user?.email);
  return true;
}
