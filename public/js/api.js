/**
 * API Client — wrapper pour tous les appels au backend.
 * Inclut automatiquement le token JWT Supabase.
 *
 * RÈGLE D'OR : ne JAMAIS rediriger vers /login.html ici.
 * Seul supabase-auth.js (requireSession) gère la redirection.
 * Si l'API renvoie une erreur, on retourne des données vides — pas un redirect.
 */
const API_BASE = '/api';

async function authHeaders() {
  const token = await getAuthToken();

  // Debug : log les 10 premiers caractères du token
  if (token) {
    console.log('🔑 Token envoyé :', token.substring(0, 10) + '...');
  } else {
    console.warn('⚠️ Aucun token disponible pour la requête API');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

/**
 * Safe JSON parse — retourne un fallback si le body n'est pas du JSON valide
 * (Vercel renvoie du HTML sur les erreurs 500, ce qui crashe JSON.parse)
 */
async function safeJson(res, fallback) {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : fallback;
  } catch (e) {
    console.warn('⚠️ Réponse non-JSON:', e.message);
    return fallback;
  }
}

const api = {
  // ── Clients ─────────────────────────────────────────────────────────
  async getClients() {
    try {
      const res = await fetch(`${API_BASE}/clients`, { headers: await authHeaders() });
      if (!res.ok) { console.error('GET /clients →', res.status); return []; }
      return await safeJson(res, []);
    } catch (e) { console.error('Réseau (clients):', e.message); return []; }
  },

  async getClient(id) {
    try {
      const res = await fetch(`${API_BASE}/clients/${id}`, { headers: await authHeaders() });
      if (!res.ok) return null;
      return await safeJson(res, null);
    } catch (e) { return null; }
  },

  async createClient(data) {
    try {
      const res = await fetch(`${API_BASE}/clients`, {
        method: 'POST', headers: await authHeaders(), body: JSON.stringify(data),
      });
      return { status: res.status, data: await safeJson(res, {}) };
    } catch (e) { return { status: 0, data: { error: e.message } }; }
  },

  async updateClient(id, data) {
    try {
      const res = await fetch(`${API_BASE}/clients/${id}`, {
        method: 'PUT', headers: await authHeaders(), body: JSON.stringify(data),
      });
      return { status: res.status, data: await safeJson(res, {}) };
    } catch (e) { return { status: 0, data: { error: e.message } }; }
  },

  async deleteClient(id) {
    try {
      const res = await fetch(`${API_BASE}/clients/${id}`, {
        method: 'DELETE', headers: await authHeaders(),
      });
      return { status: res.status, data: await safeJson(res, {}) };
    } catch (e) { return { status: 0, data: { error: e.message } }; }
  },

  // ── Projets ─────────────────────────────────────────────────────────
  async getProjets() {
    try {
      const res = await fetch(`${API_BASE}/projets`, { headers: await authHeaders() });
      if (!res.ok) { console.error('GET /projets →', res.status); return []; }
      return await safeJson(res, []);
    } catch (e) { console.error('Réseau (projets):', e.message); return []; }
  },

  async getProjet(id) {
    try {
      const res = await fetch(`${API_BASE}/projets/${id}`, { headers: await authHeaders() });
      if (!res.ok) return null;
      return await safeJson(res, null);
    } catch (e) { return null; }
  },

  async createProjet(data) {
    try {
      const res = await fetch(`${API_BASE}/projets`, {
        method: 'POST', headers: await authHeaders(), body: JSON.stringify(data),
      });
      return { status: res.status, data: await safeJson(res, {}) };
    } catch (e) { return { status: 0, data: { error: e.message } }; }
  },

  async updateProjet(id, data) {
    try {
      const res = await fetch(`${API_BASE}/projets/${id}`, {
        method: 'PUT', headers: await authHeaders(), body: JSON.stringify(data),
      });
      return { status: res.status, data: await safeJson(res, {}) };
    } catch (e) { return { status: 0, data: { error: e.message } }; }
  },

  async deleteProjet(id) {
    try {
      const res = await fetch(`${API_BASE}/projets/${id}`, {
        method: 'DELETE', headers: await authHeaders(),
      });
      return { status: res.status, data: await safeJson(res, {}) };
    } catch (e) { return { status: 0, data: { error: e.message } }; }
  },

  // ── Factures ────────────────────────────────────────────────────────
  async getFactures() {
    try {
      const res = await fetch(`${API_BASE}/factures`, { headers: await authHeaders() });
      if (!res.ok) { console.error('GET /factures →', res.status); return []; }
      return await safeJson(res, []);
    } catch (e) { console.error('Réseau (factures):', e.message); return []; }
  },

  async getFacture(id) {
    try {
      const res = await fetch(`${API_BASE}/factures/${id}`, { headers: await authHeaders() });
      if (!res.ok) return null;
      return await safeJson(res, null);
    } catch (e) { return null; }
  },

  async updateFacture(id, data) {
    try {
      const res = await fetch(`${API_BASE}/factures/${id}`, {
        method: 'PUT', headers: await authHeaders(), body: JSON.stringify(data),
      });
      return { status: res.status, data: await safeJson(res, {}) };
    } catch (e) { return { status: 0, data: { error: e.message } }; }
  },

  // ── Workflow ────────────────────────────────────────────────────────
  async genererFacture(projetId, tva) {
    try {
      const body = tva !== undefined ? JSON.stringify({ tva }) : '{}';
      const res = await fetch(`${API_BASE}/projets/${projetId}/generer-facture`, {
        method: 'POST', headers: await authHeaders(), body,
      });
      return { status: res.status, data: await safeJson(res, {}) };
    } catch (e) { return { status: 0, data: { error: e.message } }; }
  },

  async addLigneService(factureId, data) {
    try {
      const res = await fetch(`${API_BASE}/factures/${factureId}/lignes`, {
        method: 'POST', headers: await authHeaders(), body: JSON.stringify(data),
      });
      return { status: res.status, data: await safeJson(res, {}) };
    } catch (e) { return { status: 0, data: { error: e.message } }; }
  },

  // ── Profil ─────────────────────────────────────────────────────────
  async getProfil() {
    try {
      const res = await fetch(`${API_BASE}/profil`, { headers: await authHeaders() });
      if (!res.ok) return null;
      return await safeJson(res, null);
    } catch (e) { return null; }
  },

  async saveProfil(data) {
    try {
      const res = await fetch(`${API_BASE}/profil`, {
        method: 'POST', headers: await authHeaders(), body: JSON.stringify(data),
      });
      return { status: res.status, data: await safeJson(res, {}) };
    } catch (e) { return { status: 0, data: { error: e.message } }; }
  },
};
