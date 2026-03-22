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

// ── Config endpoint (public — pour le client Supabase frontend) ─────
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  });
});

// ── Routes API protégées ────────────────────────────────────────────
app.use('/api/clients', requireAuth, require('./routes/clients'));
app.use('/api/projets', requireAuth, require('./routes/projets'));
app.use('/api/factures', requireAuth, require('./routes/factures'));
app.use('/api', requireAuth, require('./routes/factures'));

// ── Gestion d'erreur globale ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur :', err.message);
  res.status(500).json({ error: 'Erreur interne du serveur', details: err.message });
});

// ── Démarrage asynchrone ────────────────────────────────────────────
async function start() {
  await initDatabase();
  console.log('✅ Base de données PostgreSQL initialisée');

  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('💥 Échec au démarrage :', err);
  process.exit(1);
});

module.exports = app;
