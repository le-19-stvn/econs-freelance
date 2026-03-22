const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runSql } = require('../db/database');

// ── GET /api/clients ────────────────────────────────────────────────
router.get('/', (req, res) => {
  const clients = queryAll('SELECT * FROM Client ORDER BY id DESC');
  res.json(clients);
});

// ── GET /api/clients/:id ────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const client = queryOne('SELECT * FROM Client WHERE id = ?', [req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });
  res.json(client);
});

// ── POST /api/clients ───────────────────────────────────────────────
router.post('/', (req, res) => {
  const { nom, contact_email, id_fiscal } = req.body;

  if (!nom || !contact_email) {
    return res.status(400).json({ error: 'Les champs "nom" et "contact_email" sont obligatoires.' });
  }

  const { lastId } = runSql(
    'INSERT INTO Client (nom, contact_email, id_fiscal) VALUES (?, ?, ?)',
    [nom, contact_email, id_fiscal || '']
  );

  const client = queryOne('SELECT * FROM Client WHERE id = ?', [lastId]);
  res.status(201).json(client);
});

// ── PUT /api/clients/:id ────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM Client WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Client introuvable' });

  const { nom, contact_email, id_fiscal } = req.body;

  runSql(
    'UPDATE Client SET nom = ?, contact_email = ?, id_fiscal = ? WHERE id = ?',
    [
      nom ?? existing.nom,
      contact_email ?? existing.contact_email,
      id_fiscal ?? existing.id_fiscal,
      req.params.id,
    ]
  );

  const updated = queryOne('SELECT * FROM Client WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// ── DELETE /api/clients/:id ─────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM Client WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Client introuvable' });

  runSql('DELETE FROM Client WHERE id = ?', [req.params.id]);
  res.json({ message: 'Client supprimé', id: Number(req.params.id) });
});

module.exports = router;
