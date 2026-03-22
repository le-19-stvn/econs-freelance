/**
 * Script de test automatisé pour l'API Freelance MVP.
 * Exécute tous les scénarios CRUD + workflow de facturation.
 *
 * Usage : node test/test-api.js
 * Pré-requis : le serveur doit tourner sur http://localhost:3000
 */

const BASE = 'http://localhost:3000/api';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ ${message}`);
    failed++;
  }
}

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

async function runTests() {
  console.log('\n══════════════════════════════════════');
  console.log('  🧪 Tests API — Freelance MVP');
  console.log('══════════════════════════════════════\n');

  // ─── 1. CLIENTS CRUD ──────────────────────────────────────────────

  console.log('📋 1. Créer un client');
  const { status: s1, data: client } = await api('POST', '/clients', {
    nom: 'Acme Corp',
    contact_email: 'contact@acme.com',
    id_fiscal: 'FR12345678901',
  });
  assert(s1 === 201, `POST /clients → 201 (reçu: ${s1})`);
  assert(client.nom === 'Acme Corp', `Client créé avec nom "Acme Corp"`);
  assert(client.id_fiscal === 'FR12345678901', `id_fiscal correctement enregistré`);

  console.log('\n📋 2. Lire les clients');
  const { data: clients } = await api('GET', '/clients');
  assert(Array.isArray(clients), 'GET /clients retourne un tableau');
  assert(clients.some(c => c.id === client.id), 'Le client créé apparaît dans la liste');

  console.log('\n📋 3. Mettre à jour le client');
  const { data: updatedClient } = await api('PUT', `/clients/${client.id}`, {
    nom: 'Acme Corporation',
    contact_email: 'hello@acme.com',
  });
  assert(updatedClient.nom === 'Acme Corporation', 'Nom mis à jour');
  assert(updatedClient.contact_email === 'hello@acme.com', 'Email mis à jour');

  // ─── 2. PROJETS CRUD ──────────────────────────────────────────────

  console.log('\n📋 4. Créer un projet');
  const { status: s4, data: projet } = await api('POST', '/projets', {
    client_id: client.id,
    nom_projet: 'Refonte Site Web',
    date_limite: '2026-06-30',
  });
  assert(s4 === 201, `POST /projets → 201 (reçu: ${s4})`);
  assert(projet.statut === 'En cours', 'Statut par défaut = "En cours"');
  assert(projet.peut_generer_facture === false, 'peut_generer_facture = false (En cours)');

  console.log('\n📋 5. Mettre à jour le projet en "Terminé"');
  const { data: projetTermine } = await api('PUT', `/projets/${projet.id}`, {
    statut: 'Terminé',
  });
  assert(projetTermine.statut === 'Terminé', 'Statut passé à "Terminé"');
  assert(projetTermine.peut_generer_facture === true, 'peut_generer_facture = true');

  // ─── 3. WORKFLOW : Génération de facture ──────────────────────────

  console.log('\n📋 6. Générer la facture du projet');
  const { status: s6, data: facture } = await api('POST', `/projets/${projet.id}/generer-facture`);
  assert(s6 === 201, `POST generer-facture → 201 (reçu: ${s6})`);
  assert(facture.statut === 'Brouillon', 'Statut facture = "Brouillon"');
  assert(facture.numero_facture && facture.numero_facture.startsWith('FAC-'), 'Numéro de facture généré (FAC-...)');
  assert(facture.client_id === client.id, 'client_id correct');
  assert(facture.projet_id === projet.id, 'projet_id correct');
  assert(Array.isArray(facture.lignes), 'Lignes de service présentes');
  assert(facture.lignes.length === 1, '1 ligne de service créée');
  assert(facture.lignes[0].description.includes('Refonte Site Web'), 'Ligne = nom du projet');
  assert(facture.lignes[0].type === 'Forfait', 'Type = Forfait');

  // Vérifier les montants en centimes
  assert(typeof facture.total_ht === 'number', 'total_ht est un nombre');
  assert(facture.total_ht_euros !== undefined, 'total_ht_euros est exposé');

  console.log('\n📋 7. Tenter de re-générer la facture (conflit)');
  const { status: s7 } = await api('POST', `/projets/${projet.id}/generer-facture`);
  assert(s7 === 409, `Re-génération → 409 (reçu: ${s7})`);

  console.log('\n📋 8. Lire la facture avec ses lignes');
  const { data: factureDetail } = await api('GET', `/factures/${facture.id}`);
  assert(factureDetail.client_nom !== undefined, 'client_nom inclus (PDF-ready)');
  assert(factureDetail.nom_projet !== undefined, 'nom_projet inclus (PDF-ready)');
  assert(factureDetail.lignes.length === 1, 'Lignes retournées avec la facture');
  assert(factureDetail.lignes[0].montant_ligne_euros !== undefined, 'montant_ligne_euros calculé');

  // ─── 4. RÈGLE MÉTIER : Transition de statut ───────────────────────

  console.log('\n📋 9. Tenter Brouillon → Payé (interdit)');
  const { status: s9, data: d9 } = await api('PUT', `/factures/${facture.id}`, {
    statut: 'Payé',
  });
  assert(s9 === 400, `Brouillon → Payé rejeté → 400 (reçu: ${s9})`);
  assert(d9.error && d9.error.includes('Transition'), 'Message d\'erreur de transition');

  console.log('\n📋 10. Brouillon → Envoyé → Payé (autorisé)');
  const { status: s10a, data: d10a } = await api('PUT', `/factures/${facture.id}`, {
    statut: 'Envoyé',
  });
  assert(s10a === 200, `Brouillon → Envoyé → 200 (reçu: ${s10a})`);
  assert(d10a.statut === 'Envoyé', 'Statut = Envoyé');

  const { status: s10b, data: d10b } = await api('PUT', `/factures/${facture.id}`, {
    statut: 'Payé',
  });
  assert(s10b === 200, `Envoyé → Payé → 200 (reçu: ${s10b})`);
  assert(d10b.statut === 'Payé', 'Statut = Payé');

  // ─── 5. Vérifier que le projet ne peut plus générer de facture ────

  console.log('\n📋 11. Vérifier peut_generer_facture après facturation');
  const { data: projetCheck } = await api('GET', `/projets/${projet.id}`);
  assert(projetCheck.peut_generer_facture === false, 'peut_generer_facture = false (facture existe)');

  // ─── 6. SUPPRESSION ───────────────────────────────────────────────

  console.log('\n📋 12. Supprimer le projet (cascade les factures)');
  const { status: s12 } = await api('DELETE', `/projets/${projet.id}`);
  assert(s12 === 200, `DELETE /projets/${projet.id} → 200 (reçu: ${s12})`);

  console.log('\n📋 13. Supprimer le client');
  const { status: s13 } = await api('DELETE', `/clients/${client.id}`);
  assert(s13 === 200, `DELETE /clients/${client.id} → 200 (reçu: ${s13})`);

  // ─── Résumé ───────────────────────────────────────────────────────

  console.log('\n══════════════════════════════════════');
  console.log(`  Résultat : ${passed} passés, ${failed} échoués`);
  console.log('══════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('💥 Erreur fatale :', err.message);
  process.exit(1);
});
