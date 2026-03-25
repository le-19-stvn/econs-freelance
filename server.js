const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialisation de Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'METS_TON_URL_ICI_SI_NECESSAIRE';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'METS_TA_CLE_ICI';

// ── Fonction helper pour répliquer le contexte d'Auth (le Token JWT) ──
function getSupabaseWithAuth(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new Error("Token JWT manquant dans les headers");

  // On passe le token pour prouver à Supabase et au RLS qui fait la requête
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

// ── Routes GET ultra défensives ───────────────────────────────

app.get('/api/clients', async (req, res) => {
  try {
    const supabase = getSupabaseWithAuth(req);
    const { data, error } = await supabase.from('clients').select('*');
    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (error) {
    console.error("❌ Erreur /api/clients:", error.message);
    return res.status(500).json({ error: error.message, details: "Erreur Supabase" });
  }
});

app.get('/api/projets', async (req, res) => {
  try {
    const supabase = getSupabaseWithAuth(req);
    const { data, error } = await supabase.from('projects').select('*, clients(nom, contact_email)');
    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (error) {
    console.error("❌ Erreur /api/projets:", error.message);
    return res.status(500).json({ error: error.message, details: "Erreur Supabase" });
  }
});

app.get('/api/factures', async (req, res) => {
  try {
    const supabase = getSupabaseWithAuth(req);
    const { data, error } = await supabase.from('invoices').select('*, clients(*), projects(*)');
    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (error) {
    console.error("❌ Erreur /api/factures:", error.message);
    return res.status(500).json({ error: error.message, details: "Erreur Supabase" });
  }
});

// ── Gestionnaire d'erreur natif Express (Filet de sécurité final) ──
app.use((err, req, res, next) => {
  console.error(`💥 [Erreur Non Capturée] :`, err.stack);
  res.status(500).json({ error: err.message, details: "Erreur Supabase" });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur Backend Supabase démarré sur le port ${PORT}`);
});

module.exports = app;
