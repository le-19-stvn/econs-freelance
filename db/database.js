const { Pool } = require('pg');

// ── Connexion PostgreSQL (Supabase) ─────────────────────────────────
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
  connectionTimeoutMillis: 10000,  // 10s max pour se connecter
  idleTimeoutMillis: 30000,
  max: 10,
});

// Gestion propre des erreurs de pool
pool.on('error', (err) => {
  console.error('⚠️ Erreur inattendue du pool PostgreSQL :', err.message);
});

/**
 * Initialise la base PostgreSQL et crée les tables.
 * Retry automatique si Supabase met du temps à répondre.
 */
async function initDatabase(retries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS "Client" (
            id            SERIAL PRIMARY KEY,
            nom           TEXT    NOT NULL,
            contact_email TEXT    NOT NULL,
            id_fiscal     TEXT    DEFAULT ''
          )
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS "Projet" (
            id          SERIAL PRIMARY KEY,
            client_id   INTEGER NOT NULL REFERENCES "Client"(id) ON DELETE CASCADE,
            nom_projet  TEXT    NOT NULL,
            statut      TEXT    NOT NULL DEFAULT 'En cours'
                        CHECK (statut IN ('En cours', 'Terminé')),
            date_limite TEXT,
            budget      INTEGER NOT NULL DEFAULT 0
          )
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS "Facture" (
            id              SERIAL PRIMARY KEY,
            client_id       INTEGER NOT NULL REFERENCES "Client"(id) ON DELETE CASCADE,
            projet_id       INTEGER NOT NULL REFERENCES "Projet"(id) ON DELETE CASCADE,
            numero_facture  TEXT    NOT NULL UNIQUE,
            statut          TEXT    NOT NULL DEFAULT 'Brouillon'
                            CHECK (statut IN ('Brouillon', 'Envoyé', 'Payé', 'Retard')),
            date_creation   TEXT    NOT NULL,
            total_ht        INTEGER NOT NULL DEFAULT 0,
            montant_tva     INTEGER NOT NULL DEFAULT 0,
            total_ttc       INTEGER NOT NULL DEFAULT 0
          )
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS "Ligne_Service" (
            id            SERIAL PRIMARY KEY,
            facture_id    INTEGER NOT NULL REFERENCES "Facture"(id) ON DELETE CASCADE,
            description   TEXT    NOT NULL,
            type          TEXT    NOT NULL DEFAULT 'Forfait'
                          CHECK (type IN ('Heure', 'Forfait')),
            quantite      REAL    NOT NULL DEFAULT 1,
            prix_unitaire INTEGER NOT NULL DEFAULT 0
          )
        `);

        // Migration : ajouter budget si absent
        try {
          await client.query(`ALTER TABLE "Projet" ADD COLUMN IF NOT EXISTS budget INTEGER NOT NULL DEFAULT 0`);
        } catch (err) { /* colonne déjà existante */ }

        console.log('✅ Tables PostgreSQL créées / vérifiées');
        return; // Succès → sortir de la boucle
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(`⏳ Tentative ${attempt}/${retries} échouée : ${err.message}`);
      if (attempt === retries) {
        throw new Error(`Impossible de se connecter à PostgreSQL après ${retries} tentatives : ${err.message}`);
      }
      // Attente exponentielle avant le prochain essai
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
}

// ── Wrappers async pour PostgreSQL ──────────────────────────────────

/**
 * Exécute un SELECT et retourne toutes les lignes en objets JS.
 */
async function queryAll(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * Exécute un SELECT et retourne la première ligne (ou null).
 */
async function queryOne(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Exécute un INSERT/UPDATE/DELETE et retourne { lastId, changes }.
 * Pour les INSERT, ajoutez RETURNING id à la fin de votre requête.
 */
async function runSql(sql, params = []) {
  const result = await pool.query(sql, params);
  const lastId = result.rows?.[0]?.id || 0;
  const changes = result.rowCount || 0;
  return { lastId, changes };
}

// ── Helpers de conversion centimes ↔ euros ──────────────────────────

/** Convertit des euros (nombre décimal) en centimes (entier). */
function toCents(euros) {
  return Math.round(Number(euros) * 100);
}

/** Convertit des centimes (entier) en euros (nombre décimal). */
function toEuros(cents) {
  return Number(cents) / 100;
}

/**
 * Formate un objet facture pour l'API / futur PDF.
 */
function formatFactureForApi(facture) {
  if (!facture) return null;
  return {
    ...facture,
    total_ht_euros: toEuros(facture.total_ht),
    montant_tva_euros: toEuros(facture.montant_tva),
    total_ttc_euros: toEuros(facture.total_ttc),
  };
}

/**
 * Formate une ligne de service pour l'API / futur PDF.
 */
function formatLigneForApi(ligne) {
  if (!ligne) return null;
  const montant = Math.round(Number(ligne.quantite) * Number(ligne.prix_unitaire));
  return {
    ...ligne,
    prix_unitaire_euros: toEuros(ligne.prix_unitaire),
    montant_ligne: montant,
    montant_ligne_euros: toEuros(montant),
  };
}

module.exports = {
  initDatabase,
  pool,
  queryAll,
  queryOne,
  runSql,
  toCents,
  toEuros,
  formatFactureForApi,
  formatLigneForApi,
};
