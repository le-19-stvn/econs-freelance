/* ═════════════════════════════════════════════════════════════════════
   Antigravity Freelance MVP — Main Application (Corrected)
   ═════════════════════════════════════════════════════════════════════ */

// ── Objets et Helpers ─────────────────────────────────────────────────
const glass = 'bg-white/[0.04] backdrop-blur-xl border border-white/[0.07] rounded-3xl';
const glassHover = 'hover:bg-white/[0.07] hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20 transition-all duration-300';
const btnPrimary = 'bg-gradient-to-r from-electric to-electric-light text-white font-semibold rounded-2xl px-6 py-3 hover:shadow-[0_0_24px_rgba(51,102,255,0.45)] transition-all duration-300 active:scale-[0.97]';
const btnSecondary = 'bg-white/[0.06] border border-white/[0.1] text-accent-cyan font-medium rounded-2xl px-5 py-2.5 hover:bg-white/[0.1] transition-all duration-300';
const inputClass = 'w-full px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/30 outline-none focus:border-electric/50 focus:bg-white/[0.08] transition-all duration-300 text-sm';
const labelClass = 'block text-sm font-medium text-white/60 mb-1.5';
const selectClass = 'w-full px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-white outline-none focus:border-electric/50 transition-all duration-300 text-sm appearance-none';

// ── Helper API (Le cerveau manquant) ──────────────────────────────────
const api = {
  async fetchWithAuth(endpoint, options = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };

    const response = await fetch(endpoint, {
      ...options,
      headers: { ...defaultHeaders, ...options.headers }
    });

    if (response.status === 401) {
      window.location.href = '/login.html';
      return;
    }

    const result = await response.json();
    return { status: response.status, data: result };
  },

  // Clients
  getClients: () => api.fetchWithAuth('/api/clients').then(r => r.data),
  getClient: (id) => api.fetchWithAuth(`/api/clients/${id}`).then(r => r.data),
  createClient: (data) => api.fetchWithAuth('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) => api.fetchWithAuth(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id) => api.fetchWithAuth(`/api/clients/${id}`, { method: 'DELETE' }),

  // Projets
  getProjets: () => api.fetchWithAuth('/api/projets').then(r => r.data),
  getProjet: (id) => api.fetchWithAuth(`/api/projets/${id}`).then(r => r.data),
  createProjet: (data) => api.fetchWithAuth('/api/projets', { method: 'POST', body: JSON.stringify(data) }),
  updateProjet: (id, data) => api.fetchWithAuth(`/api/projets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProjet: (id) => api.fetchWithAuth(`/api/projets/${id}`, { method: 'DELETE' }),

  // Factures
  getFactures: () => api.fetchWithAuth('/api/factures').then(r => r.data),
  getFacture: (id) => api.fetchWithAuth(`/api/factures/${id}`).then(r => r.data),
  genererFacture: (projetId, tva) => api.fetchWithAuth('/api/factures', { method: 'POST', body: JSON.stringify({ projetId, tva }) }),
  updateFacture: (id, data) => api.fetchWithAuth(`/api/factures/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Profil
  getProfile: () => api.fetchWithAuth('/api/profile').then(r => r.data),
  updateProfile: (data) => api.fetchWithAuth('/api/profile', { method: 'PUT', body: JSON.stringify(data) })
};

// ── Fonctions Utilitaires ─────────────────────────────────────────────
function statusBadge(statut) {
  const map = {
    'En cours': 'bg-electric/20 text-electric-light border-electric/30',
    'Terminé': 'bg-accent-green/20 text-accent-green border-accent-green/30',
    'Brouillon': 'bg-white/10 text-white/70 border-white/20',
    'Envoyé': 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30',
    'Payé': 'bg-accent-green/20 text-accent-green border-accent-green/30',
    'Retard': 'bg-accent-orange/20 text-accent-orange border-accent-orange/30',
  };
  return `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${map[statut] || 'bg-white/10 text-white/60 border-white/15'}">${statut}</span>`;
}

function formatEuros(cents) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
}

function formatEurosPlain(cents) {
  return ((cents || 0) / 100).toFixed(2).replace('.', ',') + ' €';
}

async function getUserProfil() {
  try {
    const profile = await api.getProfile();
    if (profile && profile.nom) return profile;
  } catch (e) { console.warn("Erreur chargement profil API, utilisation fallback"); }

  const { data: { user } } = await supabase.auth.getSession();
  return {
    nom: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur',
    email: user?.email || '',
    metier: 'Freelance',
    bio: ''
  };
}

// ── Toasts & Modales ──────────────────────────────────────────────────
function toast(message, type = 'success') {
  const colors = { success: 'from-accent-green/20 border-accent-green/30', error: 'from-accent-red/20 border-accent-red/30', info: 'from-electric/20 border-electric/30' };
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r ${colors[type]} to-navy-800 border backdrop-blur-xl text-sm text-white animate-slide-up shadow-xl mb-3`;
  el.innerHTML = `<span class="text-base">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; el.style.transition = 'all 0.3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

function openModal(html) {
  const content = document.getElementById('modal-content');
  const overlay = document.getElementById('modal-overlay');
  if (!content || !overlay) return;
  content.innerHTML = html;
  overlay.classList.remove('hidden');
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
}

// ── Navigation ────────────────────────────────────────────────────────
let currentView = 'dashboard';
const pageTitles = { dashboard: 'Dashboard', clients: 'Clients', projets: 'Projets', factures: 'Factures', profil: 'Mon Profil', parametres: 'Paramètres' };

function navigate(view) {
  currentView = view;
  window.location.hash = view;
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = pageTitles[view] || view;

  document.querySelectorAll('.nav-btn').forEach(btn => {
    const isActive = btn.dataset.nav === view;
    btn.classList.toggle('bg-electric/20', isActive);
    const svg = btn.querySelector('svg');
    if (svg) {
      svg.classList.toggle('text-electric-light', isActive);
      svg.classList.toggle('text-white/40', !isActive);
    }
  });
  renderView();
}

async function renderView() {
  const el = document.getElementById('app-content');
  if (!el) return;

  el.innerHTML = '<div class="flex items-center justify-center h-64"><div class="w-8 h-8 border-2 border-electric/30 border-t-electric rounded-full animate-spin"></div></div>';

  try {
    switch (currentView) {
      case 'dashboard':
        el.innerHTML = await renderDashboard();
        initDashboardCharts();
        break;
      case 'clients': el.innerHTML = await renderClients(); break;
      case 'projets': el.innerHTML = await renderProjets(); break;
      case 'factures': el.innerHTML = await renderFactures(); break;
      case 'profil':
        el.innerHTML = await renderProfil();
        initProfilCharts();
        break;
      case 'parametres': el.innerHTML = await renderParametres(); break;
    }
  } catch (err) {
    console.error('Erreur de rendu:', err);
    el.innerHTML = `<div class="${glass} p-12 text-center mt-12"><p class="text-white/70">Erreur de chargement. Veuillez rafraîchir.</p></div>`;
  }
}

// ── Dashboard Logic ───────────────────────────────────────────────────
async function renderDashboard() {
  const [clients, projets, factures] = await Promise.all([
    api.getClients() || [],
    api.getProjets() || [],
    api.getFactures() || []
  ]);

  window._factures = factures;
  const totalHT = (factures || []).reduce((s, f) => s + (f.total_ht || 0), 0);
  const facturesEnAttente = (factures || []).filter(f => f.statut !== 'Payé');

  return `
    <div class="grid grid-cols-12 gap-6">
      <div class="col-span-12 lg:col-span-4 flex flex-col gap-6">
        <div class="${glass} p-6">
          <p class="text-xs text-white/40 uppercase mb-1">Chiffre d'affaires</p>
          <p class="text-3xl font-bold">${formatEuros(totalHT)}</p>
          <div class="flex gap-3 mt-6">
            <button onclick="showProjetForm()" class="${btnPrimary} flex-1 text-sm py-2.5">Nouveau Projet</button>
          </div>
        </div>
        <div class="${glass} p-6">
            <h3 class="font-semibold mb-4">Clients récents</h3>
            <div class="flex flex-col gap-3">
                ${(clients || []).slice(0, 3).map(c => `<div class="p-3 bg-white/[0.03] rounded-xl text-sm">${c.nom}</div>`).join('') || '<p class="text-white/30 text-xs">Aucun client</p>'}
            </div>
        </div>
      </div>
      <div class="col-span-12 lg:col-span-8">
        <div class="${glass} p-6 h-full">
            <h3 class="font-semibold mb-4">Activité Récente</h3>
            <canvas id="revenue-chart" class="max-h-[300px]"></canvas>
        </div>
      </div>
    </div>`;
}

function initDashboardCharts() {
  const canvas = document.getElementById('revenue-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{ label: 'Revenus', data: [0, 0, 0, 0, 0, 0], borderColor: '#3366FF', tension: 0.4 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

// ── Clients Logic ─────────────────────────────────────────────────────
async function renderClients() {
  const clients = await api.getClients() || [];
  return `
    <div class="animate-slide-up">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold">Clients</h2>
        <button onclick="showClientForm()" class="${btnPrimary} text-sm">+ Nouveau Client</button>
      </div>
      <div class="grid gap-4">
        ${clients.map(c => `
          <div class="${glass} p-5 flex justify-between items-center">
            <div>
                <p class="font-semibold">${c.nom}</p>
                <p class="text-xs text-white/40">${c.contact_email}</p>
            </div>
            <button onclick="deleteClient(${c.id})" class="text-accent-red hover:bg-accent-red/10 p-2 rounded-xl">Supprimer</button>
          </div>
        `).join('') || '<p class="text-center text-white/30 p-12">Aucun client enregistré.</p>'}
      </div>
    </div>`;
}

function showClientForm(id = null) {
  openModal(`
        <div class="${glass} p-8 max-w-md mx-auto">
            <h3 class="text-lg font-bold mb-6">Ajouter un Client</h3>
            <form onsubmit="submitClient(event)" class="space-y-4">
                <input name="nom" placeholder="Nom du client" class="${inputClass}" required>
                <input name="contact_email" type="email" placeholder="Email" class="${inputClass}" required>
                <button type="submit" class="${btnPrimary} w-full">Enregistrer</button>
            </form>
        </div>
    `);
}

async function submitClient(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const res = await api.createClient(data);
  if (res.status < 300) {
    toast('Client ajouté !');
    closeModal();
    renderView();
  } else {
    toast('Erreur lors de l\'ajout', 'error');
  }
}

async function deleteClient(id) {
  if (confirm('Supprimer ce client ?')) {
    await api.deleteClient(id);
    toast('Client supprimé');
    renderView();
  }
}

// ── Profil Logic ──────────────────────────────────────────────────────
async function renderProfil() {
  const p = await getUserProfil();
  return `
    <div class="max-w-2xl mx-auto">
        <div class="${glass} p-8">
            <h2 class="text-xl font-bold mb-6">Mon Profil</h2>
            <form onsubmit="saveProfil(event)" class="space-y-4">
                <div><label class="${labelClass}">Nom Complet</label><input name="nom" value="${p.nom}" class="${inputClass}"></div>
                <div><label class="${labelClass}">Métier</label><input name="metier" value="${p.metier}" class="${inputClass}"></div>
                <div><label class="${labelClass}">Bio</label><textarea name="bio" class="${inputClass} h-24">${p.bio || ''}</textarea></div>
                <button type="submit" class="${btnPrimary} w-full">Sauvegarder</button>
            </form>
        </div>
    </div>`;
}

async function saveProfil(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const res = await api.updateProfile(data);
  if (res.status < 300) {
    toast('Profil mis à jour !');
    renderView();
  } else {
    toast('Erreur de mise à jour', 'error');
  }
}

function initProfilCharts() { }

// ── Initialization ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.slice(1) || 'dashboard';
  navigate(hash);
});

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1) || 'dashboard';
  if (hash !== currentView) navigate(hash);
});