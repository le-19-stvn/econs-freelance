const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runSql } = require('../db/database');

// ── GET /api/clients ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const clients = await queryAll('SELECT * FROM "Client" WHERE user_id = $1 ORDER BY id DESC', [req.userId]);
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/clients/:id ────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const client = await queryOne('SELECT * FROM "Client" WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!client) return res.status(404).json({ error: 'Client introuvable' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/clients ───────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { nom, contact_email, id_fiscal } = req.body;

    if (!nom || !contact_email) {
      return res.status(400).json({ error: 'Les champs "nom" et "contact_email" sont obligatoires.' });
    }

    const { lastId } = await runSql(
      'INSERT INTO "Client" (user_id, nom, contact_email, id_fiscal) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.userId, nom, contact_email, id_fiscal || '']
    );

    const client = await queryOne('SELECT * FROM "Client" WHERE id = $1', [lastId]);
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/clients/:id ────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM "Client" WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'Client introuvable' });

    const { nom, contact_email, id_fiscal } = req.body;

    await runSql(
      'UPDATE "Client" SET nom = $1, contact_email = $2, id_fiscal = $3 WHERE id = $4 AND user_id = $5',
      [
        nom ?? existing.nom,
        contact_email ?? existing.contact_email,
        id_fiscal ?? existing.id_fiscal,
        req.params.id,
        req.userId,
      ]
    );

    const updated = await queryOne('SELECT * FROM "Client" WHERE id = $1', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/clients/:id ─────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM "Client" WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'Client introuvable' });

    await runSql('DELETE FROM "Client" WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Client supprimé', id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
