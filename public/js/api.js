/**
 * API Client — wrapper pour tous les appels au backend.
 * Inclut automatiquement le token JWT Supabase.
 * Gère les erreurs réseau et les 500 sans crasher.
 */
const API_BASE = '/api';

async function authHeaders() {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Safe JSON parse — retourne un fallback si le body n'est pas du JSON valide.
 */
async function safeJson(res, fallback = null) {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : fallback;
  } catch (e) {
    return fallback;
  }
}

const api = {
  // ── Clients ─────────────────────────────────────────────────────────
  async getClients() {
    try {
      const res = await fetch(`${API_BASE}/clients`, { headers: await authHeaders() });
      if (res.status === 401) { window.location.href = '/login.html'; return []; }
      if (!res.ok) { console.error('GET /clients error:', res.status); return []; }
      return await safeJson(res, []);
    } catch (e) { console.error('Network error (clients):', e); return []; }
  },

  async getClient(id) {
    try {
      const res = await fetch(`${API_BASE}/clients/${id}`, { headers: await authHeaders() });
      if (!res.ok) return null;
      return await safeJson(res, null);
    } catch (e) { console.error('Network error (client):', e); return null; }
  },

  async createClient(data) {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await safeJson(res, {}) };
  },

  async updateClient(id, data) {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await safeJson(res, {}) };
  },

  async deleteClient(id) {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    return { status: res.status, data: await safeJson(res, {}) };
  },

  // ── Projets ─────────────────────────────────────────────────────────
  async getProjets() {
    try {
      const res = await fetch(`${API_BASE}/projets`, { headers: await authHeaders() });
      if (res.status === 401) { window.location.href = '/login.html'; return []; }
      if (!res.ok) { console.error('GET /projets error:', res.status); return []; }
      return await safeJson(res, []);
    } catch (e) { console.error('Network error (projets):', e); return []; }
  },

  async getProjet(id) {
    try {
      const res = await fetch(`${API_BASE}/projets/${id}`, { headers: await authHeaders() });
      if (!res.ok) return null;
      return await safeJson(res, null);
    } catch (e) { console.error('Network error (projet):', e); return null; }
  },

  async createProjet(data) {
    const res = await fetch(`${API_BASE}/projets`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await safeJson(res, {}) };
  },

  async updateProjet(id, data) {
    const res = await fetch(`${API_BASE}/projets/${id}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await safeJson(res, {}) };
  },

  async deleteProjet(id) {
    const res = await fetch(`${API_BASE}/projets/${id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    return { status: res.status, data: await safeJson(res, {}) };
  },

  // ── Factures ────────────────────────────────────────────────────────
  async getFactures() {
    try {
      const res = await fetch(`${API_BASE}/factures`, { headers: await authHeaders() });
      if (res.status === 401) { window.location.href = '/login.html'; return []; }
      if (!res.ok) { console.error('GET /factures error:', res.status); return []; }
      return await safeJson(res, []);
    } catch (e) { console.error('Network error (factures):', e); return []; }
  },

  async getFacture(id) {
    try {
      const res = await fetch(`${API_BASE}/factures/${id}`, { headers: await authHeaders() });
      if (!res.ok) return null;
      return await safeJson(res, null);
    } catch (e) { console.error('Network error (facture):', e); return null; }
  },

  async updateFacture(id, data) {
    const res = await fetch(`${API_BASE}/factures/${id}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await safeJson(res, {}) };
  },

  // ── Workflow ────────────────────────────────────────────────────────
  async genererFacture(projetId, tva) {
    const body = tva !== undefined ? JSON.stringify({ tva }) : '{}';
    const res = await fetch(`${API_BASE}/projets/${projetId}/generer-facture`, {
      method: 'POST',
      headers: await authHeaders(),
      body
    });
    return { status: res.status, data: await safeJson(res, {}) };
  },

  async addLigneService(factureId, data) {
    const res = await fetch(`${API_BASE}/factures/${factureId}/lignes`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await safeJson(res, {}) };
  },
};
