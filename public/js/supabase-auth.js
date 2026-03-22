/**
 * Supabase Auth Client — gestion de session côté frontend
 */
let _supabaseClient = null;

async function getSupabaseClient() {
  if (_supabaseClient) return _supabaseClient;

  const res = await fetch('/api/config');
  const config = await res.json();

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Configuration Supabase manquante');
  }

  _supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  return _supabaseClient;
}

/**
 * Retourne le token JWT de la session courante, ou redirige vers login.
 */
async function getAuthToken() {
  try {
    const sb = await getSupabaseClient();
    const { data: { session } } = await sb.auth.getSession();

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
    const sb = await getSupabaseClient();
    const { data: { user } } = await sb.auth.getUser();
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
    const sb = await getSupabaseClient();
    await sb.auth.signOut();
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
