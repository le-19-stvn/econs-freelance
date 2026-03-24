const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runSql, toCents, toEuros } = require('../db/database');

// ── GET /api/projets ────────────────────────────────────────────────
router.get('/', (req, res) => {
  const projets = queryAll(`
    SELECT p.*, c.nom AS client_nom, c.contact_email AS client_email
    FROM Projet p
    JOIN Client c ON c.id = p.client_id
    ORDER BY p.id DESC
  `);

  const enriched = projets.map(p => {
    const hasFacture = queryOne('SELECT 1 AS ok FROM Facture WHERE projet_id = ?', [p.id]);
    return {
      ...p,
      budget_euros: toEuros(p.budget),
      peut_generer_facture: p.statut === 'Terminé' && !hasFacture,
    };
  });

  res.json(enriched);
});

// ── GET /api/projets/:id ────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const projet = queryOne(`
    SELECT p.*, c.nom AS client_nom, c.contact_email AS client_email
    FROM Projet p
    JOIN Client c ON c.id = p.client_id
    WHERE p.id = ?
  `, [req.params.id]);

  if (!projet) return res.status(404).json({ error: 'Projet introuvable' });

  const hasFacture = queryOne('SELECT 1 AS ok FROM Facture WHERE projet_id = ?', [projet.id]);

  res.json({
    ...projet,
    budget_euros: toEuros(projet.budget),
    peut_generer_facture: projet.statut === 'Terminé' && !hasFacture,
  });
});

// ── POST /api/projets ───────────────────────────────────────────────
router.post('/', (req, res) => {
  const { client_id, nom_projet, date_limite, budget_euros } = req.body;

  if (!client_id || !nom_projet) {
    return res.status(400).json({ error: 'Les champs "client_id" et "nom_projet" sont obligatoires.' });
  }

  const client = queryOne('SELECT id FROM Client WHERE id = ?', [client_id]);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });

  const budgetCents = toCents(budget_euros || 0);

  const { lastId } = runSql(
    'INSERT INTO Projet (client_id, nom_projet, statut, date_limite, budget) VALUES (?, ?, ?, ?, ?)',
    [client_id, nom_projet, 'En cours', date_limite || null, budgetCents]
  );

  const projet = queryOne('SELECT * FROM Projet WHERE id = ?', [lastId]);
  res.status(201).json({ ...projet, budget_euros: toEuros(projet.budget), peut_generer_facture: false });
});

// ── PUT /api/projets/:id ────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM Projet WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Projet introuvable' });

  const { nom_projet, statut, date_limite, client_id, budget_euros } = req.body;

  const newStatut = statut ?? existing.statut;
  if (!['En cours', 'Terminé'].includes(newStatut)) {
    return res.status(400).json({ error: 'Statut invalide. Valeurs acceptées : "En cours", "Terminé".' });
  }

  const budgetCents = budget_euros !== undefined ? toCents(budget_euros) : existing.budget;

  runSql(
    'UPDATE Projet SET client_id = ?, nom_projet = ?, statut = ?, date_limite = ?, budget = ? WHERE id = ?',
    [
      client_id ?? existing.client_id,
      nom_projet ?? existing.nom_projet,
      newStatut,
      date_limite ?? existing.date_limite,
      budgetCents,
      req.params.id,
    ]
  );

  const updated = queryOne('SELECT * FROM Projet WHERE id = ?', [req.params.id]);
  const hasFacture = queryOne('SELECT 1 AS ok FROM Facture WHERE projet_id = ?', [updated.id]);

  res.json({
    ...updated,
    budget_euros: toEuros(updated.budget),
    peut_generer_facture: updated.statut === 'Terminé' && !hasFacture,
  });
});

// ── DELETE /api/projets/:id ─────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM Projet WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Projet introuvable' });

  runSql('DELETE FROM Projet WHERE id = ?', [req.params.id]);
  res.json({ message: 'Projet supprimé', id: Number(req.params.id) });
});

module.exports = router;
