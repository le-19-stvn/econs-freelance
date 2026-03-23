/* ═════════════════════════════════════════════════════════════════════
   Antigravity Freelance MVP — Main Application
   ═════════════════════════════════════════════════════════════════════ */

// ── Glass card helper ─────────────────────────────────────────────────
const glass = 'bg-[#040714]/60 backdrop-blur-2xl border border-electric/30 rounded-2xl shadow-[0_0_15px_rgba(51,102,255,0.1)] hover:border-electric/50 transition-all duration-300';
const glassHover = 'hover:bg-[#070b24]/80 hover:shadow-[0_0_25px_rgba(51,102,255,0.2)] transition-all duration-300';
const btnPrimary = 'bg-electric text-white font-swiss tracking-tight rounded-xl px-6 py-3 hover:bg-electric-light transition-all duration-300 active:scale-[0.98]';
const btnSecondary = 'bg-white/[0.03] border border-white/[0.2] text-white font-swiss tracking-tight rounded-xl px-5 py-2.5 hover:bg-white/[0.1] transition-all duration-300';
const inputClass = 'w-full px-4 py-3 rounded-lg bg-transparent border border-white/[0.15] text-white placeholder-white/30 outline-none focus:border-electric focus:bg-white/[0.02] transition-all duration-300 text-sm font-swiss tracking-tight';
const labelClass = 'block text-xs font-swiss tracking-wider text-white/50 mb-1.5 uppercase';
const selectClass = 'w-full px-4 py-3 rounded-lg bg-black border border-white/[0.15] text-white outline-none focus:border-electric transition-all duration-300 text-sm font-swiss tracking-tight appearance-none';

function statusBadge(statut) {
  const map = {
    'En cours': 'bg-electric/20 text-electric-light border-electric/30',
    'Terminé': 'bg-accent-green/20 text-accent-green border-accent-green/30',
    'Brouillon': 'bg-white/10 text-white/70 border-white/20',
    'Envoyé': 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30',
    'Payé': 'bg-accent-green/20 text-accent-green border-accent-green/30',
    'Retard': 'bg-accent-orange/20 text-accent-orange border-accent-orange/30',
  };
  return `<span class="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-swiss uppercase tracking-wider border ${map[statut] || 'bg-white/10 text-white/60 border-white/15'}">${statut}</span>`;
}

function formatEuros(cents) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function formatEurosPlain(cents) {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
}

/**
 * Récupère le profil utilisateur en fusionnant :
 * 1. Les données Supabase (email, nom Google)
 * 2. Les données sauvegardées en localStorage
 */
async function getUserProfil() {
  const saved = JSON.parse(localStorage.getItem('freelance_profil') || '{}');
  let userEmail = '';
  let userName = '';
  let userMetier = '';
  try {
    const user = await getCurrentUser();
    if (user) {
      userEmail = user.email || '';
      const meta = user.user_metadata || {};
      userName = meta.full_name || meta.name || userEmail.split('@')[0] || '';
    }
  } catch (e) { /* ignore */ }
  return {
    nom: saved.nom || userName || 'Mon Profil',
    email: saved.email || userEmail || '',
    metier: saved.metier || '',
    bio: saved.bio || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════
// PDF INVOICE GENERATION
// ═══════════════════════════════════════════════════════════════════════
async function generateInvoicePDF(factureId) {
  toast('Génération du PDF en cours...', 'info');

  const f = await api.getFacture(factureId);
  const settings = JSON.parse(localStorage.getItem('freelance_settings') || '{}');
  const profil = await getUserProfil();

  const tvaRate = settings.tva || '20';
  const siret = settings.siret || 'Non renseigné';
  const adresse = settings.adresse || 'Non renseignée';
  const dateCreation = new Date(f.date_creation).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

  const lignesHtml = (f.lignes || []).map(l => `
    <tr>
      <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; color:#374151; font-size:14px;">${l.description}</td>
      <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; text-align:center; color:#6b7280; font-size:14px;">${l.type}</td>
      <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; text-align:center; color:#6b7280; font-size:14px;">${l.quantite}</td>
      <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; text-align:right; color:#374151; font-weight:600; font-size:14px;">${formatEurosPlain(l.prix_unitaire || 0)}</td>
      <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; text-align:right; color:#374151; font-weight:600; font-size:14px;">${formatEurosPlain(l.montant_ligne || 0)}</td>
    </tr>
  `).join('');

  const invoiceHtml = `
  <div id="invoice-pdf-content" style="width:210mm; min-height:297mm; padding:32mm 20mm 20mm 20mm; font-family:'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif; color:#1f2937; background:#ffffff; box-sizing:border-box; position:relative;">

    <!-- Decorative top bar -->
    <div style="position:absolute; top:0; left:0; right:0; height:8px; background:linear-gradient(90deg, #3366FF 0%, #00D4FF 100%); border-radius:0 0 4px 4px;"></div>

    <!-- Header -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px;">
      <div>
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
          <div style="width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg, #3366FF, #00D4FF); display:flex; align-items:center; justify-content:center;">
            <span style="color:white; font-size:22px; font-weight:800;">⚡</span>
          </div>
          <div>
            <h1 style="font-size:22px; font-weight:800; color:#111827; margin:0; letter-spacing:-0.5px;">${profil.nom}</h1>
            <p style="font-size:12px; color:#6b7280; margin:2px 0 0 0;">${profil.metier || ''}</p>
          </div>
        </div>
        <div style="margin-top:12px; font-size:12px; color:#6b7280; line-height:1.7;">
          <p style="margin:0;">✉ ${profil.email}</p>
          <p style="margin:0;">📍 ${adresse}</p>
          <p style="margin:0;">SIRET : ${siret}</p>
        </div>
      </div>
      <div style="text-align:right;">
        <h2 style="font-size:32px; font-weight:800; color:#3366FF; margin:0; letter-spacing:-1px;">FACTURE</h2>
        <p style="font-size:15px; font-weight:600; color:#374151; margin:6px 0 0 0;">${f.numero_facture}</p>
        <p style="font-size:13px; color:#9ca3af; margin:4px 0 0 0;">Date : ${dateCreation}</p>
        <div style="margin-top:10px; display:inline-block; padding:4px 16px; border-radius:20px; font-size:12px; font-weight:600; letter-spacing:0.5px;
          ${f.statut === 'Payé' ? 'background:#d1fae5; color:#065f46;' : f.statut === 'Retard' ? 'background:#fef3c7; color:#92400e;' : f.statut === 'Envoyé' ? 'background:#dbeafe; color:#1e40af;' : 'background:#f3f4f6; color:#4b5563;'}">
          ${f.statut}
        </div>
      </div>
    </div>

    <!-- Client info -->
    <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; padding:20px; margin-bottom:32px;">
      <p style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#9ca3af; margin:0 0 8px 0; font-weight:600;">Facturé à</p>
      <p style="font-size:16px; font-weight:700; color:#111827; margin:0 0 4px 0;">${f.client_nom || 'Client'}</p>
      <p style="font-size:13px; color:#6b7280; margin:0;">${f.client_email || ''}</p>
      ${f.client_id_fiscal ? `<p style="font-size:12px; color:#9ca3af; margin:4px 0 0 0;">ID Fiscal : ${f.client_id_fiscal}</p>` : ''}
    </div>

    <!-- Service lines table -->
    <table style="width:100%; border-collapse:collapse; margin-bottom:32px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:12px 16px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:600; border-bottom:2px solid #e2e8f0;">Description</th>
          <th style="padding:12px 16px; text-align:center; font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:600; border-bottom:2px solid #e2e8f0;">Type</th>
          <th style="padding:12px 16px; text-align:center; font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:600; border-bottom:2px solid #e2e8f0;">Qté</th>
          <th style="padding:12px 16px; text-align:right; font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:600; border-bottom:2px solid #e2e8f0;">Prix unit.</th>
          <th style="padding:12px 16px; text-align:right; font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:600; border-bottom:2px solid #e2e8f0;">Montant</th>
        </tr>
      </thead>
      <tbody>
        ${lignesHtml}
      </tbody>
    </table>

    <!-- Totals -->
    <div style="display:flex; justify-content:flex-end; margin-bottom:40px;">
      <div style="width:280px;">
        <div style="display:flex; justify-content:space-between; padding:10px 0; font-size:14px; color:#6b7280;">
          <span>Total HT</span>
          <span style="font-weight:600; color:#374151;">${formatEurosPlain(f.total_ht || 0)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:10px 0; font-size:14px; color:#6b7280; border-bottom:1px solid #e5e7eb;">
          <span>TVA (${tvaRate}%)</span>
          <span style="font-weight:600; color:#374151;">${formatEurosPlain(f.montant_tva || 0)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:14px 0; font-size:18px; font-weight:800;">
          <span style="color:#111827;">Total TTC</span>
          <span style="color:#3366FF;">${formatEurosPlain(f.total_ttc || 0)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="position:absolute; bottom:20mm; left:20mm; right:20mm; border-top:1px solid #e5e7eb; padding-top:16px; text-align:center;">
      <p style="font-size:11px; color:#9ca3af; margin:0; line-height:1.7;">
        ${profil.nom} · SIRET ${siret} · ${adresse}
      </p>
      <p style="font-size:10px; color:#d1d5db; margin:4px 0 0 0;">
        Facture générée par Antigravity — Dashboard Freelance
      </p>
    </div>
  </div>`;

  // Create a temporary container
  const container = document.createElement('div');
  container.innerHTML = invoiceHtml;
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  try {
    const element = container.querySelector('#invoice-pdf-content');
    const filename = `Facture_${f.numero_facture}.pdf`;
    const opt = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Use jsPDF's native save() to force a proper binary PDF download
    await html2pdf().set(opt).from(element).toPdf().get('pdf').then(function (pdf) {
      pdf.save(filename);
    });

    toast('PDF téléchargé avec succès !', 'success');
  } catch (err) {
    console.error('Erreur PDF:', err);
    toast('Erreur lors de la génération du PDF', 'error');
  } finally {
    document.body.removeChild(container);
  }
}

// ── Toast ──────────────────────────────────────────────────────────────
function toast(message, type = 'success') {
  const colors = { success: 'from-accent-green/20 border-accent-green/30', error: 'from-accent-red/20 border-accent-red/30', info: 'from-electric/20 border-electric/30' };
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r ${colors[type]} to-navy-800 border backdrop-blur-xl text-sm text-white animate-slide-up shadow-xl`;
  el.innerHTML = `<span class="text-base">${icons[type]}</span><span>${message}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; el.style.transition = 'all 0.3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ── Modal ──────────────────────────────────────────────────────────────
function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ── Navigation ────────────────────────────────────────────────────────
let currentView = 'dashboard';
const pageTitles = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  projets: 'Projets',
  factures: 'Factures',
  profil: 'Mon Profil',
  parametres: 'Paramètres',
  login: 'Connexion'
};

function navigate(view) {
  if (view !== 'login' && !checkAuth()) {
    view = 'login';
    window.location.hash = 'login';
  }

  currentView = view;
  window.location.hash = view;
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = pageTitles[view] || view;

  document.querySelectorAll('.nav-btn').forEach(btn => {
    const isActive = btn.dataset.nav === view;
    btn.classList.toggle('bg-electric/20', isActive);
    btn.querySelector('svg').classList.toggle('text-electric-light', isActive);
    btn.querySelector('svg').classList.toggle('text-white/40', !isActive);
  });
  renderView();
}

async function renderView() {
  const el = document.getElementById('app-content');
  if (currentView === 'login') {
    el.innerHTML = renderLogin();
    return;
  }

  el.innerHTML = '<div class="flex items-center justify-center h-64"><div class="w-8 h-8 border-2 border-electric/30 border-t-electric rounded-full animate-spin"></div></div>';
  try {
    switch (currentView) {
      case 'dashboard': el.innerHTML = await renderDashboard(); try { initDashboardCharts(); } catch (ce) { console.error('Chart error:', ce); } break;
      case 'clients': el.innerHTML = await renderClients(); break;
      case 'projets': el.innerHTML = await renderProjets(); break;
      case 'factures': el.innerHTML = await renderFactures(); break;
      case 'profil': el.innerHTML = await renderProfil(); try { initProfilCharts(); } catch (ce) { console.error('Chart error:', ce); } break;
      case 'parametres': el.innerHTML = await renderParametres(); break;
    }
  } catch (err) {
    console.error('Erreur de chargement:', err);
    el.innerHTML = `
      <div class="${glass} p-12 text-center max-w-lg mx-auto mt-12">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-accent-red/15 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
        </div>
        <p class="text-white/70 font-semibold mb-2">Erreur de chargement</p>
        <p class="text-sm text-white/40 mb-6">${err.message || 'Le serveur a rencontré une erreur. Vérifiez votre connexion et réessayez.'}</p>
        <button onclick="renderView()" class="${btnPrimary} text-sm">Réessayer</button>
      </div>`;
    toast('Erreur: ' + (err.message || 'Impossible de charger les données'), 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════════════
async function renderDashboard() {
  let clients = [], projets = [], factures = [];
  try {
    const results = await Promise.all([api.getClients(), api.getProjets(), api.getFactures()]);
    clients = Array.isArray(results[0]) ? results[0] : [];
    projets = Array.isArray(results[1]) ? results[1] : [];
    factures = Array.isArray(results[2]) ? results[2] : [];
  } catch (e) {
    console.error('Dashboard data error:', e);
  }

  // Store factures globally for charts
  window._factures = factures;

  const totalHT = factures.reduce((s, f) => s + (f.total_ht || 0), 0);
  const totalTVA = factures.filter(f => f.statut !== 'Payé').reduce((s, f) => s + (f.montant_tva || 0), 0);
  const projetsTermines = projets.filter(p => p.statut === 'Terminé').length;
  const facturesEnAttente = factures.filter(f => ['Brouillon', 'Envoyé', 'Retard'].includes(f.statut));
  const retardCount = factures.filter(f => f.statut === 'Retard').length;

  // Update notification badge
  const badge = document.getElementById('notif-badge');
  if (retardCount > 0) { badge.textContent = retardCount; badge.classList.remove('hidden'); badge.classList.add('flex'); }

  // Monthly revenue dynamic data (Last 6 months)
  const months = [];
  const values = []; // stored in euros for calculation
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStr = d.toLocaleString('fr-FR', { month: 'short' });
    months.push(mStr.charAt(0).toUpperCase() + mStr.slice(1).replace('.', ''));
    const sumCents = factures.filter(f => {
      const fd = new Date(f.date_creation);
      return fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear() && f.statut === 'Payé';
    }).reduce((acc, f) => acc + (f.total_ht || 0), 0);
    values.push(sumCents / 100);
  }
  const maxVal = Math.max(...values, 100);

  return `
  <div class="grid grid-cols-12 gap-6">
    <!-- ─── LEFT COLUMN ───────────────────────────────────────── -->
    <div class="col-span-12 xl:col-span-4 flex flex-col gap-6">

      <!-- Summary Card (Visa-style) -->
      <div class="animate-slide-up ${glass} ${glassHover} p-8 relative overflow-hidden">
        <p class="text-[10px] text-white/40 font-swiss uppercase tracking-widest mb-1">Chiffre d'affaires total</p>
        <p class="swiss-title text-5xl text-white mb-2">${totalHT === 0 ? '— €' : formatEuros(totalHT).replace(',00', '')}</p>
        <p class="text-xs text-accent-green font-swiss tracking-tight mb-8">↑ ${projetsTermines || 0} projet${projetsTermines > 1 ? 's' : ''} terminé${projetsTermines > 1 ? 's' : ''}</p>
        <div class="grid grid-cols-2 gap-4 mb-8">
          <div class="border-t border-white/[0.15] pt-3">
            <p class="text-[10px] text-white/40 font-swiss uppercase tracking-widest mb-0.5">Clients</p>
            <p class="swiss-title text-2xl">${clients.length || 0}</p>
          </div>
          <div class="border-t border-white/[0.15] pt-3">
            <p class="text-[10px] text-white/40 font-swiss uppercase tracking-widest mb-0.5">TVA à collecter</p>
            <p class="swiss-title text-2xl text-accent-cyan">${totalTVA === 0 ? '— €' : formatEuros(totalTVA).replace(',00', '')}</p>
          </div>
        </div>
        <div class="flex gap-3 mt-4 border-t border-white/[0.1] pt-6">
          <button onclick="navigate('projets')" class="${btnPrimary} flex-1 text-sm py-3 transition-colors">Nouveau Projet</button>
          <button onclick="navigate('factures')" class="${btnSecondary} flex-1 text-sm py-3 transition-colors">Factures</button>
        </div>
      </div>

      <!-- Pending Invoices (Crypto Prices style) -->
      <div class="animate-slide-up-2 ${glass} ${glassHover} p-6">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h3 class="font-semibold text-white/90">Factures en attente</h3>
            <p class="text-xs text-white/40 mt-0.5">${facturesEnAttente.length} facture${facturesEnAttente.length > 1 ? 's' : ''}</p>
          </div>
          <button onclick="navigate('factures')" class="text-xs text-electric hover:text-electric-light transition-colors">Voir tout →</button>
        </div>
        <div class="flex flex-col gap-3">
          ${facturesEnAttente.length === 0 ? '<p class="text-sm text-white/30 text-center py-6">Aucune facture en attente</p>' :
      facturesEnAttente.slice(0, 5).map(f => `
            <div class="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 cursor-pointer group" onclick="navigate('factures')">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl ${f.statut === 'Retard' ? 'bg-accent-orange/15' : 'bg-electric/15'} flex items-center justify-center">
                  <svg class="w-4 h-4 ${f.statut === 'Retard' ? 'text-accent-orange' : 'text-electric-light'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-white/80 group-hover:text-white transition-colors">${f.numero_facture || f.nom_projet}</p>
                  <p class="text-[11px] text-white/35">${f.client_nom || ''}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm font-semibold ${f.statut === 'Retard' ? 'text-accent-orange' : 'text-white/80'}">${formatEuros(f.total_ttc || 0)}</p>
                ${statusBadge(f.statut)}
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- ─── RIGHT COLUMN ──────────────────────────────────────── -->
    <div class="col-span-12 xl:col-span-8 flex flex-col gap-6">

      <!-- Revenue Chart (Price chart style) -->
      <div class="animate-slide-up ${glass} ${glassHover} p-8">
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-[10px] text-white/40 font-swiss uppercase tracking-widest mb-1">Performance annuelle</p>
            <p class="swiss-title text-4xl mt-1">${totalHT === 0 ? '— €' : formatEuros(totalHT).replace(',00', '')} <span class="text-lg font-swiss tracking-tight text-accent-green">+${projets.length > 0 ? ((projetsTermines / projets.length) * 100).toFixed(0) : 0}%</span></p>
          </div>
          <div class="flex gap-1.5 bg-white/[0.03] border border-white/[0.1] rounded-lg p-1">
            ${['1M', '3M', '6M', '1A'].map((p, i) => `<button class="px-3.5 py-1.5 rounded-md text-[10px] font-swiss uppercase transition-all duration-200 ${i === 2 ? 'bg-electric text-white' : 'text-white/40 hover:text-white hover:bg-white/[0.05]'}">${p}</button>`).join('')}
          </div>
        </div>
        <div class="h-64 mt-6"><canvas id="revenue-chart"></canvas></div>
      </div>

      <!-- Bottom row: Monthly bars + Actions -->
      <div class="grid grid-cols-12 gap-6">
        <!-- Monthly Revenue (Swiss style bars) -->
        <div class="col-span-12 lg:col-span-7 animate-slide-up-2 ${glass} ${glassHover} p-8">
          <div class="flex items-center justify-between mb-4 border-b border-white/[0.1] pb-4">
            <div>
              <p class="text-[10px] text-white/40 font-swiss uppercase tracking-widest mb-1">Revenus du mois</p>
              <h3 class="swiss-title text-2xl text-white">Suivi en temps réel</h3>
            </div>
            <p class="swiss-title text-3xl">${values[values.length - 1] === 0 ? '— €' : formatEuros(values[values.length - 1] * 100).replace(',00', '')}</p>
          </div>
          <!-- Swiss bars -->
          <div class="flex items-end justify-between h-40 pt-4 px-2">
            ${months.map((m, i) => {
        const pct = (values[i] / maxVal) * 100;
        const change = i > 0 ? (((values[i] - values[i - 1]) / values[i - 1]) * 100).toFixed(1) : '+0.0';
        const isPositive = i === 0 || values[i] >= values[i - 1];
        return `
              <div class="flex flex-col items-center gap-3 flex-1 group">
                <span class="text-[10px] font-swiss tracking-tight ${isPositive ? 'text-accent-green' : 'text-accent-red'} opacity-0 group-hover:opacity-100 transition-opacity">${isPositive ? '+' : ''}${change}%</span>
                <div class="w-8 relative transition-all duration-500 bg-white/[0.05]" style="height:100%">
                  <div class="absolute bottom-0 left-0 right-0 bg-electric transition-all duration-300" style="height:${pct}%"></div>
                </div>
                <span class="text-[10px] text-white/40 font-swiss uppercase mt-1">${m}</span>
              </div>`;
      }).join('')}
          </div>
          <div class="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.06]">
            <span class="flex items-center gap-1.5 text-[11px] text-white/40"><span class="w-2.5 h-2.5 rounded-full bg-gradient-to-t from-electric/50 to-accent-cyan/50"></span>Revenus</span>
            <span class="flex items-center gap-1.5 text-[11px] text-white/40"><span class="w-2.5 h-2.5 rounded-full bg-white/20"></span>Objectif</span>
          </div>
        </div>

        <!-- Quick Actions (Exchange style) -->
        <div class="col-span-12 lg:col-span-5 animate-slide-up-3 ${glass} ${glassHover} p-6 flex flex-col">
          <h3 class="font-semibold text-white/90 mb-1">Actions rapides</h3>
          <p class="text-xs text-white/40 mb-5">Outils avancés</p>
          <div class="space-y-3 flex-1">
            <div class="bg-white/[0.03] rounded-2xl p-4">
              <p class="text-xs text-white/40 mb-2">Projets en cours</p>
              <p class="text-2xl font-bold">${projets.filter(p => p.statut === 'En cours').length}</p>
            </div>
            <div class="bg-white/[0.03] rounded-2xl p-4">
              <p class="text-xs text-white/40 mb-2">Factures totales</p>
              <p class="text-2xl font-bold">${factures.length}</p>
            </div>
          </div>
          <button onclick="showNewProjetFromDashboard()" class="${btnPrimary} w-full mt-5 text-center animate-glow">
            Nouveau Projet
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

function initDashboardCharts() {
  try {
    const canvas = document.getElementById('revenue-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight);
    gradient.addColorStop(0, 'rgba(51,102,255,0.25)');
    gradient.addColorStop(0.5, 'rgba(51,102,255,0.08)');
    gradient.addColorStop(1, 'rgba(51,102,255,0)');

    const labels = [];
    const chartData = [];
    const now = new Date();
    const factures = window._factures || [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = d.toLocaleString('fr-FR', { month: 'short' });
      labels.push(mStr.charAt(0).toUpperCase() + mStr.slice(1).replace('.', ''));
      const sumCents = factures.filter(f => {
        const fd = new Date(f.date_creation);
        return fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear() && f.statut === 'Payé';
      }).reduce((acc, f) => acc + (f.total_ht || 0), 0);
      chartData.push(sumCents / 100);
    }

    window._revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: chartData,
          borderColor: '#3366FF',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#3366FF',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,21,53,0.95)', titleColor: '#fff', bodyColor: '#fff', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 12, cornerRadius: 12, displayColors: false,
            callbacks: { label: ctx => formatEuros(ctx.raw * 100) },
          },
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 11 }, callback: v => v + '€' } },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    });
  } catch (e) { console.error('Dashboard chart error:', e); }
}

// ═══════════════════════════════════════════════════════════════════════
// CLIENTS VIEW
// ═══════════════════════════════════════════════════════════════════════
async function renderClients() {
  let clients = [];
  try { const r = await api.getClients(); clients = Array.isArray(r) ? r : []; } catch (e) { console.error('Clients error:', e); }
  return `
  <div class="animate-slide-up max-w-7xl mx-auto">
    <div class="flex items-end justify-between mb-8 border-b border-white/[0.1] pb-4">
      <div>
        <h2 class="swiss-title text-4xl text-white">Clients</h2>
        <p class="text-[10px] text-white/40 font-swiss uppercase tracking-widest mt-2">${clients.length} client${clients.length > 1 ? 's' : ''} enregistré${clients.length > 1 ? 's' : ''}</p>
      </div>
      <button onclick="showClientForm()" class="${btnPrimary} text-sm flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
        Nouveau Client
      </button>
    </div>
    ${clients.length === 0 ? `
      <div class="${glass} p-12 text-center">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-electric/10 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-electric/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>
        </div>
        <p class="text-white/50 font-medium">Aucun client</p>
        <p class="text-sm text-white/30 mt-1">Commencez par ajouter votre premier client</p>
      </div>` : `
      <div class="grid gap-4">
        ${clients.map(c => `
        <div class="${glass} ${glassHover} p-5 flex items-center justify-between group">
          <div class="flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-electric/20 to-accent-purple/20 flex items-center justify-center text-sm font-bold text-electric-light">${c.nom.charAt(0).toUpperCase()}</div>
            <div>
              <p class="font-semibold text-white/90">${c.nom}</p>
              <p class="text-xs text-white/40 mt-0.5">${c.contact_email}</p>
            </div>
          </div>
          <div class="flex items-center gap-6">
            <p class="text-xs text-white/30 hidden md:block">${c.id_fiscal || '—'}</p>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button onclick="showClientForm(${c.id})" class="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-electric/20 flex items-center justify-center transition-all" title="Modifier">
                <svg class="w-4 h-4 text-white/50 hover:text-electric-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
              </button>
              <button onclick="deleteClient(${c.id}, '${c.nom.replace(/'/g, "\\'")}')" class="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-accent-red/20 flex items-center justify-center transition-all" title="Supprimer">
                <svg class="w-4 h-4 text-white/50 hover:text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
              </button>
            </div>
          </div>
        </div>`).join('')}
      </div>`}
  </div>`;
}

async function showClientForm(id = null) {
  let client = { nom: '', contact_email: '', id_fiscal: '' };
  try { if (id) { client = await api.getClient(id) || client; } } catch (e) { toast('Erreur chargement client', 'error'); return; }
  openModal(`
    <div class="${glass} p-8">
      <h3 class="text-lg font-bold mb-6">${id ? 'Modifier le client' : 'Nouveau client'}</h3>
      <form id="client-form" class="space-y-4" onsubmit="submitClient(event, ${id})">
        <div><label class="${labelClass}">Nom</label><input name="nom" value="${client.nom}" class="${inputClass}" required placeholder="Ex: Acme Corp"></div>
        <div><label class="${labelClass}">Email de contact</label><input name="contact_email" type="email" value="${client.contact_email}" class="${inputClass}" required placeholder="contact@example.com"></div>
        <div><label class="${labelClass}">Identifiant fiscal</label><input name="id_fiscal" value="${client.id_fiscal || ''}" class="${inputClass}" placeholder="FR12345678901"></div>
        <div class="flex gap-3 pt-2">
          <button type="submit" class="${btnPrimary} flex-1">${id ? 'Enregistrer' : 'Créer'}</button>
          <button type="button" onclick="closeModal()" class="${btnSecondary}">Annuler</button>
        </div>
      </form>
    </div>`);
}

async function submitClient(e, id) {
  e.preventDefault();
  try {
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    let res;
    if (id) { 
      res = await api.updateClient(id, data); 
    } else { 
      res = await api.createClient(data); 
    }
    if (res && (res.status === 200 || res.status === 201)) {
      toast(id ? 'Client mis à jour' : 'Client créé');
      closeModal();
      await renderView();
    } else {
      toast('Erreur: ' + (res?.data?.error || 'Sauvegarde échouée'), 'error');
    }
  } catch (err) { toast('Erreur: ' + (err.message || 'Impossible de sauvegarder'), 'error'); }
}

async function deleteClient(id, nom) {
  openModal(`
    <div class="${glass} p-8 text-center">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-accent-red/15 flex items-center justify-center mb-4">
        <svg class="w-7 h-7 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
      </div>
      <p class="text-white/90 font-semibold mb-1">Supprimer "${nom}" ?</p>
      <p class="text-sm text-white/40 mb-6">Cette action supprimera aussi tous ses projets et factures.</p>
      <div class="flex gap-3">
        <button onclick="confirmDeleteClient(${id})" class="flex-1 bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border border-accent-red/30 font-semibold rounded-2xl px-5 py-3 transition-all">Supprimer</button>
        <button onclick="closeModal()" class="${btnSecondary} flex-1">Annuler</button>
      </div>
    </div>`);
}

async function confirmDeleteClient(id) {
  try { await api.deleteClient(id); closeModal(); toast('Client supprimé'); renderView(); }
  catch (err) { toast('Erreur suppression: ' + (err.message || ''), 'error'); }
}

// ═══════════════════════════════════════════════════════════════════════
// PROJETS VIEW
// ═══════════════════════════════════════════════════════════════════════
async function renderProjets() {
  let projets = [], clients = [];
  try {
    const results = await Promise.all([api.getProjets(), api.getClients()]);
    projets = Array.isArray(results[0]) ? results[0] : [];
    clients = Array.isArray(results[1]) ? results[1] : [];
  } catch (e) { console.error('Projets error:', e); }
  window._clients = clients;
  return `
  <div class="animate-slide-up max-w-7xl mx-auto">
    <div class="flex items-end justify-between mb-8 border-b border-white/[0.1] pb-4">
      <div>
        <h2 class="swiss-title text-4xl text-white">Projets</h2>
        <p class="text-[10px] text-white/40 font-swiss uppercase tracking-widest mt-2">${projets.length} projet${projets.length > 1 ? 's' : ''}</p>
      </div>
      <button onclick="showProjetForm()" class="${btnPrimary} text-sm flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
        Nouveau Projet
      </button>
    </div>
    ${projets.length === 0 ? `
      <div class="${glass} p-12 text-center">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-electric/10 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-electric/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>
        </div>
        <p class="text-white/50 font-medium">Aucun projet</p>
        <p class="text-sm text-white/30 mt-1">${clients.length === 0 ? 'Créez d\'abord un client' : 'Créez votre premier projet'}</p>
      </div>` : `
      <div class="grid gap-4">
        ${projets.map(p => `
        <div class="${glass} ${glassHover} p-5 group">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-11 h-11 rounded-xl ${p.statut === 'Terminé' ? 'bg-accent-green/15' : 'bg-electric/15'} flex items-center justify-center">
                <svg class="w-5 h-5 ${p.statut === 'Terminé' ? 'text-accent-green' : 'text-electric-light'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>
              </div>
              <div>
                <p class="font-semibold text-white/90">${p.nom_projet}</p>
                <p class="text-xs text-white/40 mt-0.5">${p.client_nom || ''} ${p.date_limite ? '· Échéance : ' + new Date(p.date_limite).toLocaleDateString('fr-FR') : ''}</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              ${statusBadge(p.statut)}
              ${p.peut_generer_facture ? `<button onclick="genererFacture(${p.id})" class="${btnPrimary} text-xs px-4 py-2 animate-glow" title="Générer la facture">⚡ Générer Facture</button>` : ''}
              <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button onclick="showProjetForm(${p.id})" class="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-electric/20 flex items-center justify-center transition-all" title="Modifier">
                  <svg class="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
                </button>
                <button onclick="deleteProjet(${p.id}, '${p.nom_projet.replace(/'/g, "\\'")}')" class="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-accent-red/20 flex items-center justify-center transition-all" title="Supprimer">
                  <svg class="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>`).join('')}
      </div>`}
  </div>`;
}

async function showProjetForm(id = null) {
  const clients = window._clients || await api.getClients();
  if (!clients || clients.length === 0) {
    toast("Veuillez d'abord créer un client.", "info");
    navigate('clients');
    return;
  }
  let projet = { nom_projet: '', client_id: '', date_limite: '', statut: 'En cours', budget_euros: '' };
  if (id) { projet = await api.getProjet(id); }
  openModal(`
    <div class="${glass} p-8">
      <h3 class="text-lg font-bold mb-6">${id ? 'Modifier le projet' : 'Nouveau projet'}</h3>
      <form id="projet-form" class="space-y-4" onsubmit="submitProjet(event, ${id})">
        <div><label class="${labelClass}">Nom du projet</label><input name="nom_projet" value="${projet.nom_projet}" class="${inputClass}" required placeholder="Ex: Refonte site web"></div>
        <div>
          <label class="${labelClass}">Client</label>
          <select name="client_id" class="${selectClass}" required>
            <option value="">Sélectionnez un client</option>
            ${clients.map(c => `<option value="${c.id}" ${c.id == projet.client_id ? 'selected' : ''}>${c.nom}</option>`).join('')}
          </select>
        </div>
        <div><label class="${labelClass}">Budget estimé (€)</label><input name="budget_euros" type="text" inputmode="decimal" value="${projet.budget_euros !== undefined ? projet.budget_euros : ''}" class="${inputClass}" required placeholder="Ex: 1500.50"></div>
        <div><label class="${labelClass}">Date limite</label><input name="date_limite" type="date" value="${projet.date_limite ? projet.date_limite.slice(0, 10) : ''}" class="${inputClass}"></div>
        ${id ? `<div><label class="${labelClass}">Statut</label>
          <select name="statut" class="${selectClass}">
            <option value="En cours" ${projet.statut === 'En cours' ? 'selected' : ''}>En cours</option>
            <option value="Terminé" ${projet.statut === 'Terminé' ? 'selected' : ''}>Terminé</option>
          </select></div>` : ''}
        <div class="flex gap-3 pt-2">
          <button type="submit" class="${btnPrimary} flex-1">${id ? 'Enregistrer' : 'Créer'}</button>
          <button type="button" onclick="closeModal()" class="${btnSecondary}">Annuler</button>
        </div>
      </form>
    </div>`);
}

async function showNewProjetFromDashboard() {
  window._clients = await api.getClients();
  if (window._clients.length === 0) { toast('Créez d\'abord un client', 'info'); navigate('clients'); return; }
  showProjetForm();
}

async function submitProjet(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);

  if (data.budget_euros) {
    data.budget_euros = String(data.budget_euros).replace(',', '.');
  }

  if (id) {
    const res = await api.updateProjet(id, data);
    if (res.status !== 200 && res.status !== 201) { toast(res.data?.error || 'Erreur', 'error'); return; }
    if (res.data?.peut_generer_facture) toast('Projet terminé ! Vous pouvez générer la facture.', 'info');
    else toast('Projet mis à jour');
  } else {
    const res = await api.createProjet(data);
    if (res.status !== 201 && res.status !== 200) { toast(res.data?.error || 'Erreur', 'error'); return; }
    toast('Projet créé');
  }
  closeModal();
  await renderView();
}

async function genererFacture(projetId) {
  const settings = JSON.parse(localStorage.getItem('freelance_settings') || '{"tva":"20"}');
  const res = await api.genererFacture(projetId, settings.tva);
  if (res.status === 201 || res.status === 200) { toast('Facture générée avec succès !'); await renderView(); }
  else if (res.status === 409) { toast('Une facture existe déjà pour ce projet', 'error'); }
  else { toast(res.data?.error || 'Erreur', 'error'); }
}

async function deleteProjet(id, nom) {
  openModal(`
    <div class="${glass} p-8 text-center">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-accent-red/15 flex items-center justify-center mb-4">
        <svg class="w-7 h-7 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
      </div>
      <p class="text-white/90 font-semibold mb-1">Supprimer "${nom}" ?</p>
      <p class="text-sm text-white/40 mb-6">Les factures associées seront aussi supprimées.</p>
      <div class="flex gap-3">
        <button onclick="confirmDeleteProjet(${id})" class="flex-1 bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border border-accent-red/30 font-semibold rounded-2xl px-5 py-3 transition-all">Supprimer</button>
        <button onclick="closeModal()" class="${btnSecondary} flex-1">Annuler</button>
      </div>
    </div>`);
}
async function confirmDeleteProjet(id) { try { await api.deleteProjet(id); closeModal(); toast('Projet supprimé'); renderView(); } catch (err) { toast('Erreur: ' + (err.message || ''), 'error'); } }

// ═══════════════════════════════════════════════════════════════════════
// FACTURES VIEW
// ═══════════════════════════════════════════════════════════════════════
async function renderFactures() {
  let factures = [];
  try { const r = await api.getFactures(); factures = Array.isArray(r) ? r : []; } catch (e) { console.error('Factures error:', e); }
  return `
  <div class="animate-slide-up max-w-7xl mx-auto">
    <div class="flex items-end justify-between mb-8 border-b border-white/[0.1] pb-4">
      <div>
        <h2 class="swiss-title text-4xl text-white">Factures</h2>
        <p class="text-[10px] text-white/40 font-swiss uppercase tracking-widest mt-2">${factures.length} facture${factures.length > 1 ? 's' : ''}</p>
      </div>
      <button onclick="showNouvelleFactureModal()" class="${btnPrimary} text-sm flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
        Nouvelle Facture
      </button>
    </div>
    ${factures.length === 0 ? `
      <div class="${glass} p-12 text-center">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-electric/10 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-electric/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
        </div>
        <p class="text-white/50 font-medium">Aucune facture</p>
        <p class="text-sm text-white/30 mt-1">Terminez un projet pour générer votre première facture</p>
      </div>` : `
      <div class="grid gap-4">
        ${factures.map(f => `
        <div class="${glass} ${glassHover} p-5 cursor-pointer group" onclick="showFactureDetail(${f.id})">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-11 h-11 rounded-xl ${f.statut === 'Payé' ? 'bg-accent-green/15' : f.statut === 'Retard' ? 'bg-accent-orange/15' : 'bg-electric/15'} flex items-center justify-center">
                <svg class="w-5 h-5 ${f.statut === 'Payé' ? 'text-accent-green' : f.statut === 'Retard' ? 'text-accent-orange' : 'text-electric-light'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
              </div>
              <div>
                <p class="font-semibold text-white/90">${f.numero_facture}</p>
                <p class="text-xs text-white/40 mt-0.5">${f.client_nom} · ${f.nom_projet}</p>
              </div>
            </div>
            <div class="flex items-center gap-5">
              ${statusBadge(f.statut)}
              <div class="text-right">
                <p class="text-base font-bold text-white/90">${formatEuros(f.total_ttc || 0)}</p>
                <p class="text-[11px] text-white/35">TTC</p>
              </div>
              <button onclick="event.stopPropagation(); generateInvoicePDF(${f.id})" class="w-9 h-9 rounded-xl bg-electric/15 hover:bg-electric/30 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100" title="Télécharger en PDF">
                <svg class="w-4 h-4 text-electric-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
              </button>
              <svg class="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
            </div>
          </div>
        </div>`).join('')}
      </div>`}
  </div>`;
}

async function showFactureDetail(id) {
  const f = await api.getFacture(id);
  const transitions = { 'Brouillon': ['Envoyé'], 'Envoyé': ['Payé', 'Retard'], 'Retard': ['Payé'], 'Payé': [] };
  const nextStatuts = transitions[f.statut] || [];

  openModal(`
    <div class="${glass} p-8 max-h-[85vh] overflow-y-auto" style="min-width:480px">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-lg font-bold">${f.numero_facture}</h3>
          <p class="text-sm text-white/40 mt-0.5">${f.client_nom} · ${f.nom_projet}</p>
        </div>
        ${statusBadge(f.statut)}
      </div>

      <!-- Info grid -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-white/[0.03] rounded-2xl p-4">
          <p class="text-[11px] text-white/40 mb-0.5">Client</p>
          <p class="text-sm font-medium">${f.client_nom}</p>
          <p class="text-xs text-white/35">${f.client_email || ''}</p>
        </div>
        <div class="bg-white/[0.03] rounded-2xl p-4">
          <p class="text-[11px] text-white/40 mb-0.5">Date de création</p>
          <p class="text-sm font-medium">${new Date(f.date_creation).toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      <!-- Service lines -->
      <div class="mb-6">
        <p class="text-sm font-semibold text-white/70 mb-3">Lignes de service</p>
        <div class="space-y-2">
          ${(f.lignes || []).map(l => `
          <div class="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03]">
            <div>
              <p class="text-sm font-medium text-white/80">${l.description}</p>
              <p class="text-xs text-white/35">${l.type} · Qté: ${l.quantite}</p>
            </div>
            <p class="text-sm font-semibold">${formatEuros(l.prix_unitaire || 0)}</p>
          </div>`).join('')}
        </div>
      </div>

      <!-- Totals -->
      <div class="bg-white/[0.03] rounded-2xl p-5 mb-6">
        <div class="flex justify-between text-sm mb-2"><span class="text-white/50">Total HT</span><span class="font-medium">${formatEuros(f.total_ht || 0)}</span></div>
        <div class="flex justify-between text-sm mb-2"><span class="text-white/50">TVA</span><span class="font-medium">${formatEuros(f.montant_tva || 0)}</span></div>
        <div class="flex justify-between text-base pt-2 border-t border-white/[0.08]"><span class="font-semibold">Total TTC</span><span class="font-bold text-electric-light">${formatEuros(f.total_ttc || 0)}</span></div>
      </div>

      <!-- PDF Download Button -->
      <div class="mb-4">
        <button onclick="generateInvoicePDF(${f.id})" class="w-full bg-gradient-to-r from-electric to-electric-light text-white font-semibold rounded-2xl px-5 py-3 hover:shadow-[0_0_24px_rgba(51,102,255,0.45)] transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-2">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
          Télécharger en PDF
        </button>
      </div>

      <!-- Status transitions -->
      ${nextStatuts.length > 0 ? `
      <div class="flex gap-3 mt-4 border-t border-white/[0.06] pt-4">
        ${nextStatuts.map(s => {
    const cls = s === 'Payé' ? 'bg-accent-green/20 hover:bg-accent-green/30 text-accent-green border-accent-green/30' :
      s === 'Retard' ? 'bg-accent-orange/20 hover:bg-accent-orange/30 text-accent-orange border-accent-orange/30' :
        'bg-electric/20 hover:bg-electric/30 text-electric-light border-electric/30';
    return `<button onclick="updateFactureStatut(${f.id}, '${s}')" class="flex-1 ${cls} border font-semibold rounded-2xl px-5 py-3 transition-all">Marquer « ${s} »</button>`;
  }).join('')}
      </div>` : '<p class="mt-4 pt-4 border-t border-white/[0.06] text-center text-sm text-accent-green font-medium">✓ Facture finalisée</p>'}
    </div>`);
}

async function updateFactureStatut(id, statut) {
  const res = await api.updateFacture(id, { statut });
  if (res.status === 200) { toast(`Facture passée en "${statut}"`); closeModal(); await renderView(); }
  else { toast(res.data?.error || 'Erreur de transition', 'error'); }
}

async function showNouvelleFactureModal() {
  let projets = [];
  try { projets = await api.getProjets(); } catch(e) {}
  const projetsTermines = (Array.isArray(projets) ? projets : []).filter(p => p.statut === 'Terminé' && p.peut_generer_facture);
  
  if (projetsTermines.length === 0) {
    toast("Aucun projet terminé en attente de facturation.", 'info');
    return;
  }
  
  openModal(`
    <div class="${glass} p-8">
      <h3 class="text-lg font-bold mb-6">Nouvelle Facture</h3>
      <form id="facture-form" class="space-y-4" onsubmit="submitNouvelleFacture(event)">
        <div>
          <label class="${labelClass}">Sélectionner un projet validé</label>
          <select name="projet_id" class="${selectClass}" required>
            <option value="">-- Choisissez un projet --</option>
            ${projetsTermines.map(p => `<option value="${p.id}">${p.nom_projet} (${p.client_nom})</option>`).join('')}
          </select>
        </div>
        <div class="flex gap-3 pt-4">
          <button type="submit" class="${btnPrimary} flex-1 text-sm">Générer la facture</button>
          <button type="button" onclick="closeModal()" class="${btnSecondary} text-sm">Annuler</button>
        </div>
      </form>
    </div>
  `);
}

async function submitNouvelleFacture(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  if (!data.projet_id) return;
  
  const res = await api.genererFacture(data.projet_id, 20);
  if (res.status === 201 || res.status === 200) {
    toast('Facture générée !');
    closeModal();
    await renderView();
  } else {
    toast(res.data?.error || 'Erreur de génération', 'error');
  }
}


// ═══════════════════════════════════════════════════════════════════════
// PROFIL VIEW
// ═══════════════════════════════════════════════════════════════════════
async function renderProfil() {
  const p = await getUserProfil();

  let factures = [];
  try { factures = await api.getFactures(); } catch (e) { }
  window._factures = factures;

  const facturesPayees = factures.filter(f => f.statut === 'Payé');
  const totalGagne = facturesPayees.reduce((s, f) => s + (f.total_ht || 0), 0);
  const totalClients = new Set(facturesPayees.map(f => f.client_id)).size;

  return `
  <div class="animate-slide-up max-w-4xl mx-auto">
    <div class="flex items-end justify-between mb-8 border-b border-white/[0.1] pb-4">
      <h2 class="swiss-title text-4xl text-white">Profil</h2>
    </div>
    
    <div class="grid grid-cols-1 gap-6">
      <!-- Form & Info -->
      <div class="${glass} p-8">
        <div class="flex items-center justify-between mb-8 border-b border-white/[0.1] pb-4">
          <div class="flex items-center gap-6">
            <div class="w-20 h-20 rounded-xl bg-electric flex items-center justify-center text-3xl font-swiss tracking-tight text-white relative group cursor-pointer border border-white/[0.2]">
              ${p.nom.charAt(0).toUpperCase() || 'P'}
            </div>
            <div>
              <h3 class="swiss-title text-3xl text-white/90">${p.nom || '—'}</h3>
              <p class="text-xs font-swiss text-electric-light tracking-widest uppercase mt-1">${p.metier || 'Métier non défini'}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-[10px] text-white/40 font-swiss uppercase tracking-widest mb-1">Total gagné</p>
            <p class="swiss-title text-3xl text-electric-light">${totalGagne === 0 ? '— €' : formatEuros(totalGagne).replace(',00', '')}</p>
          </div>
        </div>
        
        <form onsubmit="saveProfil(event)" class="space-y-6">
          <div class="grid grid-cols-2 gap-6">
            <div><label class="${labelClass}">Nom complet</label><input name="nom" value="${p.nom}" class="${inputClass}" required></div>
            <div><label class="${labelClass}">Email</label><input type="email" name="email" value="${p.email}" class="${inputClass}" required></div>
          </div>
          <div><label class="${labelClass}">Métier</label><input name="metier" value="${p.metier}" class="${inputClass}"></div>
          <div><label class="${labelClass}">Bio</label><textarea name="bio" class="${inputClass} min-h-[100px] resize-none">${p.bio}</textarea></div>
          <div class="pt-4"><button type="submit" class="${btnPrimary} w-full">${p.has_profil_db ? 'Mettre à jour le profil' : 'Créer et lier mon profil'}</button></div>
        </form>
      </div>
    </div>
  </div>`;
}

// ── Pas besoin de graphiques pour l'instant (plus brutaliste)
function initProfilCharts() {
  // Vide (Optionnel : si on veut on remettra un graph, mais Swiss Design sans pie chart est plus clean)
}

async function saveProfil(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  
  try {
    const res = await api.saveProfil(data);
    if (res && res.status !== 200 && res.status !== 201) {
      toast(res.data?.error || 'Erreur lors de la sauvegarde du profil', 'error');
      return;
    }
  } catch (err) {
    console.error('saveProfil error:', err);
  }
  
  // Fallback / Cache local
  localStorage.setItem('freelance_profil', JSON.stringify(data));

  // Mettre à jour l'affichage dans le header
  const nameEl = document.getElementById('header-user-name');
  const emailEl = document.getElementById('header-user-email');
  const dName = document.getElementById('dropdown-user-name');
  const dEmail = document.getElementById('dropdown-user-email');
  if (nameEl) nameEl.textContent = data.nom;
  if (emailEl) emailEl.textContent = data.email;
  if (dName) dName.textContent = data.nom;
  if (dEmail) dEmail.textContent = data.email;

  toast('Profil mis à jour avec succès');
  renderView();
}

// ═══════════════════════════════════════════════════════════════════════
// PARAMÈTRES VIEW
// ═══════════════════════════════════════════════════════════════════════
async function renderParametres() {
  const s = JSON.parse(localStorage.getItem('freelance_settings') || '{"siret":"123 456 789 00012","adresse":"123 Rue de la Startup\\n75001 Paris, France","tva":"20","theme":"dark"}');

  return `
  <div class="animate-slide-up max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold">Paramètres</h2>
    </div>

    <form onsubmit="saveParametres(event)" class="space-y-8">
      <!-- Facturation -->
      <div class="${glass} p-8">
        <h3 class="text-lg font-semibold text-white/90 mb-1">Informations de Facturation</h3>
        <p class="text-xs text-white/40 mb-6">Ces informations seront utilisées par défaut lors de la génération des factures.</p>
        
        <div class="space-y-5">
          <div><label class="${labelClass}">Numéro SIRET</label><input name="siret" value="${s.siret}" class="${inputClass}" placeholder="123 456 789 00012"></div>
          <div><label class="${labelClass}">Adresse du siège social</label><textarea name="adresse" class="${inputClass} min-h-[80px] resize-none" placeholder="Votre adresse professionnelle">${s.adresse}</textarea></div>
          <div class="w-1/2"><label class="${labelClass}">Taux de TVA par défaut (%)</label><input type="number" step="0.1" name="tva" value="${s.tva}" class="${inputClass}"></div>
        </div>
      </div>

      <!-- Apparence -->
      <div class="animate-slide-up-2 ${glass} p-8">
        <h3 class="text-lg font-semibold text-white/90 mb-1">Apparence</h3>
        <p class="text-xs text-white/40 mb-6">Personnalisez l'interface de votre dashboard.</p>
        
        <div class="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
          <div>
            <p class="font-medium text-white/90">Thème de l'application</p>
            <p class="text-xs text-white/40 mt-0.5">Basculer entre le mode clair et sombre (actuellement forcé en Dark Glassmorphism).</p>
          </div>
          <!-- Toggle Switch Stylisé -->
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" name="themeToggle" value="light" class="sr-only peer" ${s.theme === 'light' ? 'checked' : ''}>
            <div class="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-electric"></div>
            <span class="ml-3 text-sm font-medium text-white/60 peer-checked:text-white transition-colors capitalize" id="theme-label">${s.theme || 'dark'} mode</span>
          </label>
        </div>
      </div>

      <div class="flex justify-end pt-2">
        <button type="submit" class="${btnPrimary} animate-glow px-10">Sauvegarder les paramètres</button>
      </div>
    </form>
  </div>`;
}

function saveParametres(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  data.theme = fd.get('themeToggle') ? 'light' : 'dark';
  document.getElementById('theme-label').textContent = data.theme + ' mode';
  localStorage.setItem('freelance_settings', JSON.stringify(data));
  toast('Paramètres sauvegardés avec succès');
}

// ═══════════════════════════════════════════════════════════════════════
// LOGIN VIEW
// ═══════════════════════════════════════════════════════════════════════
function renderLogin() {
  // Login is now handled by login.html — redirect there
  window.location.href = '/login.html';
  return '<div class="flex items-center justify-center h-64"><p class="text-white/50">Redirection vers la page de connexion...</p></div>';
}


// ═══════════════════════════════════════════════════════════════════════
// PROFILE DROPDOWN

// ═══════════════════════════════════════════════════════════════════════
function toggleProfileMenu(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('profile-dropdown');
  const chevron = document.getElementById('profile-chevron');
  const isOpen = !dropdown.classList.contains('hidden');
  dropdown.classList.toggle('hidden', isOpen);
  if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function closeProfileMenu() {
  const dropdown = document.getElementById('profile-dropdown');
  const chevron = document.getElementById('profile-chevron');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    dropdown.classList.add('hidden');
    if (chevron) chevron.style.transform = '';
  }
}

function profileAction(action) {
  closeProfileMenu();
  switch (action) {
    case 'profil': navigate('profil'); break;
    case 'parametres': navigate('parametres'); break;
    case 'deconnexion': signOut(); break; // calls supabase-auth.js signOut()
  }
}

// ═══════════════════════════════════════════════════════════════════════
// AUTHENTICATION — powered by Supabase (see supabase-auth.js)
// ═══════════════════════════════════════════════════════════════════════
function checkAuth() {
  // Auth is handled by the guard in index.html (requireSession)
  // If we're here, the user is already authenticated
  return true;
}

function logout() {
  signOut(); // from supabase-auth.js — clears session + redirects to /login.html
}

function checkLayout() {
  const isAuth = checkAuth();
  const sidebar = document.getElementById('sidebar');
  const header = document.querySelector('header');
  const main = document.querySelector('main');

  if (!isAuth) {
    if (sidebar) sidebar.style.display = 'none';
    if (header) header.style.display = 'none';
    if (main) {
      main.classList.remove('ml-[78px]');
      main.classList.add('ml-0');
    }
  } else {
    if (sidebar) sidebar.style.display = 'flex';
    if (header) header.style.display = 'flex';
    if (main) {
      main.classList.remove('ml-0');
      main.classList.add('ml-[78px]');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  checkLayout();
  const initialHash = window.location.hash.slice(1);
  const hash = checkAuth() ? (initialHash && initialHash !== 'login' ? initialHash : 'dashboard') : 'login';
  navigate(hash);

  // Close profile dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#profile-btn') && !e.target.closest('#profile-dropdown')) {
      closeProfileMenu();
    }
  });
});
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1) || (checkAuth() ? 'dashboard' : 'login');
  if (hash !== currentView) navigate(hash);
});
