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
router.post('/projets/:id/generer-facture', async (req, res) => {
  try {
    const projet = await queryOne(`
      SELECT p.*, c.nom AS client_nom
      FROM "Projet" p
      JOIN "Client" c ON c.id = p.client_id
      WHERE p.id = $1
    `, [req.params.id]);

    if (!projet) return res.status(404).json({ error: 'Projet introuvable' });

    if (projet.statut !== 'Terminé') {
      return res.status(400).json({
        error: 'Le projet doit être en statut "Terminé" pour générer une facture.',
      });
    }

    const existingFacture = await queryOne('SELECT id FROM "Facture" WHERE projet_id = $1', [projet.id]);
    if (existingFacture) {
      return res.status(409).json({
        error: 'Une facture existe déjà pour ce projet.',
        facture_id: existingFacture.id,
      });
    }

    // Numéro unique FAC-YYYYMMDD-XXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const countRow = await queryOne(
      "SELECT COUNT(*) AS n FROM \"Facture\" WHERE numero_facture LIKE $1",
      [`FAC-${dateStr}-%`]
    );
    const seq = String((Number(countRow?.n) || 0) + 1).padStart(3, '0');
    const numeroFacture = `FAC-${dateStr}-${seq}`;
    const dateCreation = now.toISOString();

    // Récupérer le taux de TVA et calculer les totaux
    const tva = req.body.tva !== undefined ? Number(req.body.tva) : (req.query.tva !== undefined ? Number(req.query.tva) : 20);
    const totalHt = projet.budget || 0; // en centimes
    const montantTva = Math.round(totalHt * tva / 100);
    const totalTtc = totalHt + montantTva;

    // Créer la facture
    const { lastId: factureId } = await runSql(
      `INSERT INTO "Facture" (client_id, projet_id, numero_facture, statut, date_creation, total_ht, montant_tva, total_ttc)
       VALUES ($1, $2, $3, 'Brouillon', $4, $5, $6, $7) RETURNING id`,
      [projet.client_id, projet.id, numeroFacture, dateCreation, totalHt, montantTva, totalTtc]
    );

    // Créer la ligne de service générique basée sur le budget
    await runSql(
      `INSERT INTO "Ligne_Service" (facture_id, description, type, quantite, prix_unitaire)
       VALUES ($1, $2, 'Forfait', 1, $3) RETURNING id`,
      [factureId, `Prestation : ${projet.nom_projet}`, totalHt]
    );

    const facture = await queryOne('SELECT * FROM "Facture" WHERE id = $1', [factureId]);
    const lignes = await queryAll('SELECT * FROM "Ligne_Service" WHERE facture_id = $1', [factureId]);

    res.status(201).json({
      ...formatFactureForApi(facture),
      client_nom: projet.client_nom,
      nom_projet: projet.nom_projet,
      lignes: lignes.map(formatLigneForApi),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/factures ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const factures = await queryAll(`
      SELECT f.*, c.nom AS client_nom, p.nom_projet
      FROM "Facture" f
      JOIN "Client" c ON c.id = f.client_id
      JOIN "Projet" p ON p.id = f.projet_id
      ORDER BY f.id DESC
    `);

    res.json(factures.map(f => ({
      ...formatFactureForApi(f),
      client_nom: f.client_nom,
      nom_projet: f.nom_projet,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/factures/:id ───────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const facture = await queryOne(`
      SELECT f.*,
             c.nom AS client_nom, c.contact_email AS client_email, c.id_fiscal AS client_id_fiscal,
             p.nom_projet, p.date_limite AS projet_date_limite
      FROM "Facture" f
      JOIN "Client" c ON c.id = f.client_id
      JOIN "Projet" p ON p.id = f.projet_id
      WHERE f.id = $1
    `, [req.params.id]);

    if (!facture) return res.status(404).json({ error: 'Facture introuvable' });

    const lignes = await queryAll('SELECT * FROM "Ligne_Service" WHERE facture_id = $1', [facture.id]);

    res.json({
      ...formatFactureForApi(facture),
      lignes: lignes.map(formatLigneForApi),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/factures/:id ───────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM "Facture" WHERE id = $1', [req.params.id]);
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
      const lignes = await queryAll('SELECT * FROM "Ligne_Service" WHERE facture_id = $1', [existing.id]);
      totalHt = lignes.reduce((sum, l) => sum + Math.round(Number(l.quantite) * Number(l.prix_unitaire)), 0);
      const tva = taux_tva !== undefined ? taux_tva : 20;
      montantTva = Math.round(totalHt * tva / 100);
      totalTtc = totalHt + montantTva;
    }

    await runSql(
      'UPDATE "Facture" SET statut = $1, total_ht = $2, montant_tva = $3, total_ttc = $4 WHERE id = $5',
      [statut ?? existing.statut, totalHt, montantTva, totalTtc, req.params.id]
    );

    const updated = await queryOne('SELECT * FROM "Facture" WHERE id = $1', [req.params.id]);
    const lignes = await queryAll('SELECT * FROM "Ligne_Service" WHERE facture_id = $1', [updated.id]);

    res.json({
      ...formatFactureForApi(updated),
      lignes: lignes.map(formatLigneForApi),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/factures/:id/lignes ───────────────────────────────────
router.post('/:id/lignes', async (req, res) => {
  try {
    const facture = await queryOne('SELECT * FROM "Facture" WHERE id = $1', [req.params.id]);
    if (!facture) return res.status(404).json({ error: 'Facture introuvable' });

    const { description, type, quantite, prix_unitaire_euros } = req.body;
    if (!description) return res.status(400).json({ error: 'Le champ "description" est obligatoire.' });

    const prixCents = prix_unitaire_euros !== undefined ? toCents(prix_unitaire_euros) : 0;

    const { lastId } = await runSql(
      'INSERT INTO "Ligne_Service" (facture_id, description, type, quantite, prix_unitaire) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [facture.id, description, type || 'Forfait', quantite || 1, prixCents]
    );

    const ligne = await queryOne('SELECT * FROM "Ligne_Service" WHERE id = $1', [lastId]);
    res.status(201).json(formatLigneForApi(ligne));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/factures/:factureId/lignes/:ligneId ─────────────────
router.delete('/:factureId/lignes/:ligneId', async (req, res) => {
  try {
    const ligne = await queryOne(
      'SELECT * FROM "Ligne_Service" WHERE id = $1 AND facture_id = $2',
      [req.params.ligneId, req.params.factureId]
    );

    if (!ligne) return res.status(404).json({ error: 'Ligne de service introuvable' });

    await runSql('DELETE FROM "Ligne_Service" WHERE id = $1', [req.params.ligneId]);
    res.json({ message: 'Ligne supprimée', id: Number(req.params.ligneId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
