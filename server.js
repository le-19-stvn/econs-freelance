const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db/database');
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
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YmhtbWVza2hjZXJyd2N0aHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzM5NjMsImV4cCI6MjA4OTcwOTk2M30.BonoQ5HYPnPu8ewLZaeXxjT9HdBv3zBjZoPzZXFW-Rk',
  });
});

// ── Routes API protégées ────────────────────────────────────────────
app.use('/api/clients', requireAuth, require('./routes/clients'));
app.use('/api/projets', requireAuth, require('./routes/projets'));
app.use('/api/factures', requireAuth, require('./routes/factures'));
app.use('/api/profil', requireAuth, require('./routes/profil'));

// ── Gestion d'erreur globale (catch-all) ────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur :', err.message, err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur', details: err.message });
});

// ── Démarrage asynchrone ────────────────────────────────────────────
async function start() {
  // Vérification des variables d'environnement au démarrage
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
