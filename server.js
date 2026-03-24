const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Logging Middleware (Vercel) ───────────────────────────────────────
app.use('/api', (req, res, next) => {
  console.log(`[ROUTE DÉMARRÉE] ${req.method} /api${req.url}`);
  if (Object.keys(req.body || {}).length > 0) {
    console.log(`[BODY]`, JSON.stringify(req.body).substring(0, 500));
  }
  next();
});

// ── Routes API ──────────────────────────────────────────────────────
app.use('/api/profile', require('./routes/profile'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/projets', require('./routes/projets'));
app.use('/api/factures', require('./routes/factures'));

// ── Gestion d'erreur globale ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`❌ [Erreur Supabase / Serveur] :`, err.message, err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur', details: err.message });
});

// ── Démarrage asynchrone (sql.js est async) ─────────────────────────
async function start() {
  await initDatabase();
  console.log('✅ Base de données initialisée');

  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('💥 Échec au démarrage :', err);
  process.exit(1);
});

module.exports = app;
