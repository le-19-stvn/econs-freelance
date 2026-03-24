const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runSql, formatFactureForApi, formatLigneForApi, toCents } = require('../db/database');

// ── Transitions de statut autorisées ────────────────────────────────
const TRANSITIONS_VALIDES = {
  'Brouillon': ['Envoyé'],
  'Envoyé':    ['Payé', 'Retard'],
  'Retard':    ['Payé'],
  'Payé':      [],
};

// ── POST /api/projets/:id/generer-facture ───────────────────────────
router.post('/projets/:id/generer-facture', (req, res) => {
  const projet = queryOne(`
    SELECT p.*, c.nom AS client_nom
    FROM Projet p
    JOIN Client c ON c.id = p.client_id
    WHERE p.id = ?
  `, [req.params.id]);

  if (!projet) return res.status(404).json({ error: 'Projet introuvable' });

  if (projet.statut !== 'Terminé') {
    return res.status(400).json({
      error: 'Le projet doit être en statut "Terminé" pour générer une facture.',
    });
  }

  const existingFacture = queryOne('SELECT id FROM Facture WHERE projet_id = ?', [projet.id]);
  if (existingFacture) {
    return res.status(409).json({
      error: 'Une facture existe déjà pour ce projet.',
      facture_id: existingFacture.id,
    });
  }

  // Numéro unique FAC-YYYYMMDD-XXX
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const countRow = queryOne(
    "SELECT COUNT(*) AS n FROM Facture WHERE numero_facture LIKE ?",
    [`FAC-${dateStr}-%`]
  );
  const seq = String((countRow?.n || 0) + 1).padStart(3, '0');
  const numeroFacture = `FAC-${dateStr}-${seq}`;
  const dateCreation = now.toISOString();

  // Récupérer le taux de TVA et calculer les totaux
  const tva = req.body.tva !== undefined ? Number(req.body.tva) : (req.query.tva !== undefined ? Number(req.query.tva) : 20);
  const totalHt = projet.budget || 0; // en centimes
  const montantTva = Math.round(totalHt * tva / 100);
  const totalTtc = totalHt + montantTva;

  // Créer la facture
  const { lastId: factureId } = runSql(
    `INSERT INTO Facture (client_id, projet_id, numero_facture, statut, date_creation, total_ht, montant_tva, total_ttc)
     VALUES (?, ?, ?, 'Brouillon', ?, ?, ?, ?)`,
    [projet.client_id, projet.id, numeroFacture, dateCreation, totalHt, montantTva, totalTtc]
  );

  // Créer la ligne de service générique basée sur le budget
  runSql(
    `INSERT INTO Ligne_Service (facture_id, description, type, quantite, prix_unitaire)
     VALUES (?, ?, 'Forfait', 1, ?)`,
    [factureId, `Prestation : ${projet.nom_projet}`, totalHt]
  );

  const facture = queryOne('SELECT * FROM Facture WHERE id = ?', [factureId]);
  const lignes = queryAll('SELECT * FROM Ligne_Service WHERE facture_id = ?', [factureId]);

  res.status(201).json({
    ...formatFactureForApi(facture),
    client_nom: projet.client_nom,
    nom_projet: projet.nom_projet,
    lignes: lignes.map(formatLigneForApi),
  });
});

// ── GET /api/factures ───────────────────────────────────────────────
router.get('/', (req, res) => {
  const factures = queryAll(`
    SELECT f.*, c.nom AS client_nom, p.nom_projet
    FROM Facture f
    JOIN Client c ON c.id = f.client_id
    JOIN Projet p ON p.id = f.projet_id
    ORDER BY f.id DESC
  `);

  res.json(factures.map(f => ({
    ...formatFactureForApi(f),
    client_nom: f.client_nom,
    nom_projet: f.nom_projet,
  })));
});

// ── GET /api/factures/:id ───────────────────────────────────────────
router.get('/:id', (req, res) => {
  const facture = queryOne(`
    SELECT f.*,
           c.nom AS client_nom, c.contact_email AS client_email, c.id_fiscal AS client_id_fiscal,
           p.nom_projet, p.date_limite AS projet_date_limite
    FROM Facture f
    JOIN Client c ON c.id = f.client_id
    JOIN Projet p ON p.id = f.projet_id
    WHERE f.id = ?
  `, [req.params.id]);

  if (!facture) return res.status(404).json({ error: 'Facture introuvable' });

  const lignes = queryAll('SELECT * FROM Ligne_Service WHERE facture_id = ?', [facture.id]);

  res.json({
    ...formatFactureForApi(facture),
    lignes: lignes.map(formatLigneForApi),
  });
});

// ── PUT /api/factures/:id ───────────────────────────────────────────
router.put('/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM Facture WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Facture introuvable' });

  const { statut, taux_tva } = req.body;

  // Validation de la transition de statut
  if (statut && statut !== existing.statut) {
    const transitions = TRANSITIONS_VALIDES[existing.statut];
    if (!transitions || !transitions.includes(statut)) {
      return res.status(400).json({
        error: `Transition de statut invalide : "${existing.statut}" → "${statut}". Transitions autorisées : ${(TRANSITIONS_VALIDES[existing.statut] || []).join(', ') || 'aucune'}.`,
      });
    }
  }

  // Recalcul des totaux si demandé
  let totalHt = existing.total_ht;
  let montantTva = existing.montant_tva;
  let totalTtc = existing.total_ttc;

  if (taux_tva !== undefined || req.body.recalculer) {
    const lignes = queryAll('SELECT * FROM Ligne_Service WHERE facture_id = ?', [existing.id]);
    totalHt = lignes.reduce((sum, l) => sum + Math.round(Number(l.quantite) * Number(l.prix_unitaire)), 0);
    const tva = taux_tva !== undefined ? taux_tva : 20;
    montantTva = Math.round(totalHt * tva / 100);
    totalTtc = totalHt + montantTva;
  }

  runSql(
    'UPDATE Facture SET statut = ?, total_ht = ?, montant_tva = ?, total_ttc = ? WHERE id = ?',
    [statut ?? existing.statut, totalHt, montantTva, totalTtc, req.params.id]
  );

  const updated = queryOne('SELECT * FROM Facture WHERE id = ?', [req.params.id]);
  const lignes = queryAll('SELECT * FROM Ligne_Service WHERE facture_id = ?', [updated.id]);

  res.json({
    ...formatFactureForApi(updated),
    lignes: lignes.map(formatLigneForApi),
  });
});

// ── POST /api/factures/:id/lignes ───────────────────────────────────
router.post('/:id/lignes', (req, res) => {
  const facture = queryOne('SELECT * FROM Facture WHERE id = ?', [req.params.id]);
  if (!facture) return res.status(404).json({ error: 'Facture introuvable' });

  const { description, type, quantite, prix_unitaire_euros } = req.body;
  if (!description) return res.status(400).json({ error: 'Le champ "description" est obligatoire.' });

  const prixCents = prix_unitaire_euros !== undefined ? toCents(prix_unitaire_euros) : 0;

  const { lastId } = runSql(
    'INSERT INTO Ligne_Service (facture_id, description, type, quantite, prix_unitaire) VALUES (?, ?, ?, ?, ?)',
    [facture.id, description, type || 'Forfait', quantite || 1, prixCents]
  );

  const ligne = queryOne('SELECT * FROM Ligne_Service WHERE id = ?', [lastId]);
  res.status(201).json(formatLigneForApi(ligne));
});

// ── DELETE /api/factures/:factureId/lignes/:ligneId ─────────────────
router.delete('/:factureId/lignes/:ligneId', (req, res) => {
  const ligne = queryOne(
    'SELECT * FROM Ligne_Service WHERE id = ? AND facture_id = ?',
    [req.params.ligneId, req.params.factureId]
  );

  if (!ligne) return res.status(404).json({ error: 'Ligne de service introuvable' });

  runSql('DELETE FROM Ligne_Service WHERE id = ?', [req.params.ligneId]);
  res.json({ message: 'Ligne supprimée', id: Number(req.params.ligneId) });
});

module.exports = router;
