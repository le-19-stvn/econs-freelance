/**
 * API Client — wrapper pour tous les appels au backend.
 * Inclut automatiquement le token JWT Supabase.
 */
const API_BASE = '/api';

async function authHeaders() {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

const api = {
  // ── Clients ─────────────────────────────────────────────────────────
  async getClients() {
    const res = await fetch(`${API_BASE}/clients`, { headers: await authHeaders() });
    if (res.status === 401) { window.location.href = '/login.html'; return []; }
    return res.json();
  },

  async getClient(id) {
    const res = await fetch(`${API_BASE}/clients/${id}`, { headers: await authHeaders() });
    return res.json();
  },

  async createClient(data) {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await res.json() };
  },

  async updateClient(id, data) {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await res.json() };
  },

  async deleteClient(id) {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    return { status: res.status, data: await res.json() };
  },

  // ── Projets ─────────────────────────────────────────────────────────
  async getProjets() {
    const res = await fetch(`${API_BASE}/projets`, { headers: await authHeaders() });
    if (res.status === 401) { window.location.href = '/login.html'; return []; }
    return res.json();
  },

  async getProjet(id) {
    const res = await fetch(`${API_BASE}/projets/${id}`, { headers: await authHeaders() });
    return res.json();
  },

  async createProjet(data) {
    const res = await fetch(`${API_BASE}/projets`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await res.json() };
  },

  async updateProjet(id, data) {
    const res = await fetch(`${API_BASE}/projets/${id}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await res.json() };
  },

  async deleteProjet(id) {
    const res = await fetch(`${API_BASE}/projets/${id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    return { status: res.status, data: await res.json() };
  },

  // ── Factures ────────────────────────────────────────────────────────
  async getFactures() {
    const res = await fetch(`${API_BASE}/factures`, { headers: await authHeaders() });
    if (res.status === 401) { window.location.href = '/login.html'; return []; }
    return res.json();
  },

  async getFacture(id) {
    const res = await fetch(`${API_BASE}/factures/${id}`, { headers: await authHeaders() });
    return res.json();
  },

  async updateFacture(id, data) {
    const res = await fetch(`${API_BASE}/factures/${id}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await res.json() };
  },

  // ── Workflow ────────────────────────────────────────────────────────
  async genererFacture(projetId, tva) {
    const body = tva !== undefined ? JSON.stringify({ tva }) : '{}';
    const res = await fetch(`${API_BASE}/projets/${projetId}/generer-facture`, {
      method: 'POST',
      headers: await authHeaders(),
      body
    });
    return { status: res.status, data: await res.json() };
  },

  async addLigneService(factureId, data) {
    const res = await fetch(`${API_BASE}/factures/${factureId}/lignes`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await res.json() };
  },
};
