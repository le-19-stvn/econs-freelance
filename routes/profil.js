const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/profil
// Récupère le profil de l'utilisateur connecté
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const profil = await db.queryOne(
      `SELECT * FROM "Profil" WHERE user_id = $1`,
      [userId]
    );
    res.json(profil || {});
  } catch (err) {
    console.error('Erreur GET /api/profil:', err);
    res.status(500).json({ error: 'Erreur serveur interne' });
  }
});

// POST /api/profil
// Crée ou met à jour le profil
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    const { nom, email, metier, bio } = req.body;

    const query = `
      INSERT INTO "Profil" (user_id, nom, email, metier, bio, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
        nom = EXCLUDED.nom,
        email = EXCLUDED.email,
        metier = EXCLUDED.metier,
        bio = EXCLUDED.bio,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const result = await db.queryOne(query, [userId, nom, email, metier, bio]);
    res.status(200).json(result);
  } catch (err) {
    console.error('Erreur POST /api/profil:', err);
    res.status(500).json({ error: 'Erreur serveur interne' });
  }
});

module.exports = router;
