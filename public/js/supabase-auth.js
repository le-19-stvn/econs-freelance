/**
 * Supabase Auth Client — gestion de session côté frontend
 * Clés hardcodées (identiques à login.html)
 */

const SUPABASE_URL = 'https://witaufezvdbjuweqgnzn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdGF1ZmV6dmRianV3ZXFnbnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTQwNzAsImV4cCI6MjA4OTc3MDA3MH0.lhI0QkWxZTFgW2TUzpHzyaSeONULBrEGYJY40R9DJ34';

const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Retourne le token JWT de la session courante, ou redirige vers login.
 */
async function getAuthToken() {
  try {
    const { data: { session } } = await _sb.auth.getSession();
    if (!session) {
      window.location.href = '/login.html';
      return null;
    }
    return session.access_token;
  } catch (e) {
    console.error('Erreur auth:', e);
    window.location.href = '/login.html';
    return null;
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
  localStorage.clear();
  window.location.href = '/login.html';
}

/**
 * Vérifie que l'utilisateur est connecté, sinon redirige.
 */
async function requireSession() {
  const token = await getAuthToken();
  if (!token) return false;
  return true;
}
