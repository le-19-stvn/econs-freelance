const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, queryOne } = require('./db/database');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Debug : log toutes les requêtes API ─────────────────────────────
app.use('/api', (req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} [${new Date().toISOString()}]`);
  next();
});

// ── Health check (public) ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.SUPABASE_JWT_SECRET,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    },
  });
});

// ── Config endpoint (public — pour le client Supabase frontend) ─────
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || 'https://yubhmmeskhcerrwcthyi.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // Remplacé par le vôtre
  });
});

// ── ROUTES DIRECTES POUR PROFIL (Upsert) ────────────────────────────
// Permet de gérer les requêtes du frontend directement vers /api/profile
const profileUpsertHandler = async (req, res, next) => {
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
    const result = await queryOne(query, [userId, nom, email, metier, bio]);
    res.status(200).json(result); // Enregistré avec succès
  } catch (err) {
    next(err); // Renvoi vers le middleware global d'erreurs
  }
};
app.put('/api/profile', requireAuth, profileUpsertHandler);
app.post('/api/profile', requireAuth, profileUpsertHandler);
app.put('/api/profil', requireAuth, profileUpsertHandler); // Alias au cas où

// ── Routes API protégées (Fichiers séparés) ─────────────────────────
app.use('/api/clients', requireAuth, require('./routes/clients'));
app.use('/api/projets', requireAuth, require('./routes/projets'));
app.use('/api/factures', requireAuth, require('./routes/factures'));
app.use('/api/profil', requireAuth, require('./routes/profil'));

// ── Gestion d'erreur globale (catch-all) ────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur :', err.message, err.stack);
  
  // Définit un 400 si l'erreur provient d'une syntaxe DB, sinon 500
  const statusCode = err.message.includes('not found') || err.message.includes('invalid input') ? 400 : 500;
  
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Erreur interne du serveur' : err.message,
    details: err.message
  });
});

// ── Démarrage asynchrone ────────────────────────────────────────────
async function start() {
  if (!process.env.DATABASE_URL) {
    console.error('⚠️  DATABASE_URL non définie !');
  }
  if (!process.env.SUPABASE_JWT_SECRET) {
    console.error('⚠️  SUPABASE_JWT_SECRET non définie ! Les requêtes authentifiées échoueront.');
  }

  try {
    await initDatabase();
    console.log('✅ Base de données PostgreSQL initialisée');
  } catch (err) {
    console.error('⚠️ Erreur init DB (le serveur continue) :', err.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('💥 Échec au démarrage :', err);
});

module.exports = app;
