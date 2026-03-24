const express = require('express');
const router = express.Router();

router.put('/', async (req, res, next) => {
  console.log('[SUPABASE] Modification du profil', req.body);
  try {
    // Fake impl. à adapter selon la vraie DB Supabase
    res.json({ message: 'Profil mis à jour' });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  console.log('[SUPABASE] Création du profil', req.body);
  try {
    res.status(201).json({ message: 'Profil créé' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
