/**
 * API Client — wrapper pour tous les appels au backend.
 */
const API_BASE = '/api';

const api = {
  // ── Clients ─────────────────────────────────────────────────────────
  async getClients() {
    try {
      const res = await fetch(`${API_BASE}/clients`);
      if (!res.ok) throw new Error("Erreur HTTP");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      if (typeof toast !== 'undefined') toast("Erreur de connexion aux données (Clients)", "error");
      return [];
    }
  },

  async getClient(id) {
    const res = await fetch(`${API_BASE}/clients/${id}`);
    return res.json();
  },

  async createClient(data) {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await res.json() };
  },

  async updateClient(id, data) {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await res.json() };
  },

  async deleteClient(id) {
    const res = await fetch(`${API_BASE}/clients/${id}`, { method: 'DELETE' });
    return { status: res.status, data: await res.json() };
  },

  // ── Projets ─────────────────────────────────────────────────────────
  async getProjets() {
    try {
      const res = await fetch(`${API_BASE}/projets`);
      if (!res.ok) throw new Error("Erreur HTTP");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      if (typeof toast !== 'undefined') toast("Erreur de connexion aux données (Projets)", "error");
      return [];
    }
  },

  async getProjet(id) {
    const res = await fetch(`${API_BASE}/projets/${id}`);
    return res.json();
  },

  async createProjet(data) {
    const res = await fetch(`${API_BASE}/projets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await res.json() };
  },

  async updateProjet(id, data) {
    const res = await fetch(`${API_BASE}/projets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await res.json() };
  },

  async deleteProjet(id) {
    const res = await fetch(`${API_BASE}/projets/${id}`, { method: 'DELETE' });
    return { status: res.status, data: await res.json() };
  },

  // ── Factures ────────────────────────────────────────────────────────
  async getFactures() {
    try {
      const res = await fetch(`${API_BASE}/factures`);
      if (!res.ok) throw new Error("Erreur HTTP");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      if (typeof toast !== 'undefined') toast("Erreur de connexion aux données (Factures)", "error");
      return [];
    }
  },

  async getFacture(id) {
    const res = await fetch(`${API_BASE}/factures/${id}`);
    return res.json();
  },

  async updateFacture(id, data) {
    const res = await fetch(`${API_BASE}/factures/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await res.json() };
  },

  // ── Workflow ────────────────────────────────────────────────────────
  async genererFacture(projetId, tva) {
    const body = tva !== undefined ? JSON.stringify({ tva }) : '{}';
    const res = await fetch(`${API_BASE}/projets/${projetId}/generer-facture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    return { status: res.status, data: await res.json() };
  },

  async addLigneService(factureId, data) {
    const res = await fetch(`${API_BASE}/factures/${factureId}/lignes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return { status: res.status, data: await res.json() };
  },
};
