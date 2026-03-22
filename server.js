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

// ── Routes API ──────────────────────────────────────────────────────
app.use('/api/clients', require('./routes/clients'));
app.use('/api/projets', require('./routes/projets'));
app.use('/api/factures', require('./routes/factures'));
app.use('/api', require('./routes/factures'));

// ── Gestion d'erreur globale ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur :', err.message);
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
