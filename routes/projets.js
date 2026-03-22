const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runSql, toCents, toEuros } = require('../db/database');

// ── GET /api/projets ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const projets = await queryAll(`
      SELECT p.*, c.nom AS client_nom, c.contact_email AS client_email
      FROM "Projet" p
      JOIN "Client" c ON c.id = p.client_id
      WHERE p.user_id = $1
      ORDER BY p.id DESC
    `, [req.userId]);

    const enriched = [];
    for (const p of projets) {
      const hasFacture = await queryOne('SELECT 1 AS ok FROM "Facture" WHERE projet_id = $1', [p.id]);
      enriched.push({
        ...p,
        budget_euros: toEuros(p.budget),
        peut_generer_facture: p.statut === 'Terminé' && !hasFacture,
      });
    }

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/projets/:id ────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const projet = await queryOne(`
      SELECT p.*, c.nom AS client_nom, c.contact_email AS client_email
      FROM "Projet" p
      JOIN "Client" c ON c.id = p.client_id
      WHERE p.id = $1 AND p.user_id = $2
    `, [req.params.id, req.userId]);

    if (!projet) return res.status(404).json({ error: 'Projet introuvable' });

    const hasFacture = await queryOne('SELECT 1 AS ok FROM "Facture" WHERE projet_id = $1', [projet.id]);

    res.json({
      ...projet,
      budget_euros: toEuros(projet.budget),
      peut_generer_facture: projet.statut === 'Terminé' && !hasFacture,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/projets ───────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { client_id, nom_projet, date_limite, budget_euros } = req.body;

    if (!client_id || !nom_projet) {
      return res.status(400).json({ error: 'Les champs "client_id" et "nom_projet" sont obligatoires.' });
    }

    const client = await queryOne('SELECT id FROM "Client" WHERE id = $1 AND user_id = $2', [client_id, req.userId]);
    if (!client) return res.status(404).json({ error: 'Client introuvable' });

    const budgetCents = toCents(budget_euros || 0);

    const { lastId } = await runSql(
      'INSERT INTO "Projet" (user_id, client_id, nom_projet, statut, date_limite, budget) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [req.userId, client_id, nom_projet, 'En cours', date_limite || null, budgetCents]
    );

    const projet = await queryOne('SELECT * FROM "Projet" WHERE id = $1', [lastId]);
    res.status(201).json({ ...projet, budget_euros: toEuros(projet.budget), peut_generer_facture: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/projets/:id ────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM "Projet" WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'Projet introuvable' });

    const { nom_projet, statut, date_limite, client_id, budget_euros } = req.body;

    const newStatut = statut ?? existing.statut;
    if (!['En cours', 'Terminé'].includes(newStatut)) {
      return res.status(400).json({ error: 'Statut invalide. Valeurs acceptées : "En cours", "Terminé".' });
    }

    const budgetCents = budget_euros !== undefined ? toCents(budget_euros) : existing.budget;

    await runSql(
      'UPDATE "Projet" SET client_id = $1, nom_projet = $2, statut = $3, date_limite = $4, budget = $5 WHERE id = $6 AND user_id = $7',
      [
        client_id ?? existing.client_id,
        nom_projet ?? existing.nom_projet,
        newStatut,
        date_limite ?? existing.date_limite,
        budgetCents,
        req.params.id,
        req.userId,
      ]
    );

    const updated = await queryOne('SELECT * FROM "Projet" WHERE id = $1', [req.params.id]);
    const hasFacture = await queryOne('SELECT 1 AS ok FROM "Facture" WHERE projet_id = $1', [updated.id]);

    res.json({
      ...updated,
      budget_euros: toEuros(updated.budget),
      peut_generer_facture: updated.statut === 'Terminé' && !hasFacture,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/projets/:id ─────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM "Projet" WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'Projet introuvable' });

    await runSql('DELETE FROM "Projet" WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Projet supprimé', id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
