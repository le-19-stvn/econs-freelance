-- =================================================================================
-- MISSION AGENT C : Configuration SQL et RLS (Supabase)
-- =================================================================================

-- 1. Création des tables
CREATE TABLE IF NOT EXISTS "Profil" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nom text,
  email text,
  metier text,
  bio text,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Client" (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nom text NOT NULL,
  contact_email text NOT NULL,
  id_fiscal text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Projet" (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id integer REFERENCES "Client"(id) ON DELETE CASCADE NOT NULL,
  nom_projet text NOT NULL,
  statut text DEFAULT 'En cours',
  budget integer DEFAULT 0,
  date_limite timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Facture" (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id integer REFERENCES "Client"(id) ON DELETE CASCADE NOT NULL,
  projet_id integer REFERENCES "Projet"(id) ON DELETE CASCADE NOT NULL,
  numero_facture text NOT NULL UNIQUE,
  statut text DEFAULT 'Brouillon',
  total_ht integer DEFAULT 0,
  montant_tva integer DEFAULT 0,
  total_ttc integer DEFAULT 0,
  date_creation timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Ligne_Service" (
  id serial PRIMARY KEY,
  facture_id integer REFERENCES "Facture"(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  type text DEFAULT 'Forfait',
  quantite numeric DEFAULT 1,
  prix_unitaire integer DEFAULT 0
);

-- 2. Activation du RLS sur TOUTES les tables
ALTER TABLE "Profil" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Projet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Facture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ligne_Service" ENABLE ROW LEVEL SECURITY;

-- 3. Suppression des anciennes Policies (pour réinitialiser proprement)
DROP POLICY IF EXISTS "Profil_policy" ON "Profil";
DROP POLICY IF EXISTS "Client_policy" ON "Client";
DROP POLICY IF EXISTS "Projet_policy" ON "Projet";
DROP POLICY IF EXISTS "Facture_policy" ON "Facture";
DROP POLICY IF EXISTS "Ligne_Service_policy" ON "Ligne_Service";

-- 4. Création des Policies dynamiques (basées sur auth.uid() == user_id)
-- Profil
CREATE POLICY "Profil_policy" ON "Profil"
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Client
CREATE POLICY "Client_policy" ON "Client"
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Projets
CREATE POLICY "Projet_policy" ON "Projet"
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Factures
CREATE POLICY "Facture_policy" ON "Facture"
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Ligne de service (vérification via la table Facture parent)
CREATE POLICY "Ligne_Service_policy" ON "Ligne_Service"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Facture" f WHERE f.id = facture_id AND f.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM "Facture" f WHERE f.id = facture_id AND f.user_id = auth.uid())
  );
