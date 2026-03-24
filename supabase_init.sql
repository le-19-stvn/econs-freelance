-- ==========================================
-- MISSION AGENT C : SCRIPT DE REINITIALISATION SUPABASE
-- ==========================================
-- Ce script : 
-- 1. Supprime les tables existantes (Attention : perte de données !)
-- 2. Recrée les tables (profiles, clients, projects, invoices)
-- 3. Configure des politiques ultra-permissives pour les utilisateurs authentifiés

-- 1. Suppression des tables existantes (Drop)
DROP TABLE IF EXISTS "public"."invoices" CASCADE;
DROP TABLE IF EXISTS "public"."factures" CASCADE; -- Au cas où l'ancien nom était utilisé
DROP TABLE IF EXISTS "public"."projects" CASCADE;
DROP TABLE IF EXISTS "public"."projets" CASCADE; -- Au cas où
DROP TABLE IF EXISTS "public"."clients" CASCADE;
DROP TABLE IF EXISTS "public"."profiles" CASCADE;

-- 2. Création des tables
-- PROFILES
CREATE TABLE "public"."profiles" (
    "id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "metier" TEXT,
    "bio" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CLIENTS
CREATE TABLE "public"."clients" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "nom" TEXT NOT NULL,
    "contact_email" TEXT,
    "id_fiscal" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PROJECTS (Projets)
CREATE TABLE "public"."projects" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "client_id" UUID NOT NULL REFERENCES "public"."clients"("id") ON DELETE CASCADE,
    "nom_projet" TEXT NOT NULL,
    "budget_euros" NUMERIC(10,2),
    "date_limite" DATE,
    "statut" TEXT DEFAULT 'En cours',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- INVOICES (Factures)
CREATE TABLE "public"."invoices" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "client_id" UUID NOT NULL REFERENCES "public"."clients"("id") ON DELETE CASCADE,
    "project_id" UUID REFERENCES "public"."projects"("id") ON DELETE SET NULL,
    "numero_facture" TEXT NOT NULL,
    "total_ht" INTEGER DEFAULT 0,
    "montant_tva" INTEGER DEFAULT 0,
    "total_ttc" INTEGER DEFAULT 0,
    "statut" TEXT DEFAULT 'Brouillon', -- Brouillon, Envoyé, Payé, Retard
    "lignes" JSONB DEFAULT '[]'::jsonb,
    "date_creation" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Configuration des Policies (RLS Extrêmement Permissif pour les utilisateurs authentifiés)
-- Activer le RLS
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;

-- Création des Policies (Accès total pour auth.role() = 'authenticated')

-- Profiles Policies
CREATE POLICY "Permissive All Profiles" ON "public"."profiles" 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Clients Policies
CREATE POLICY "Permissive All Clients" ON "public"."clients" 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Projects Policies
CREATE POLICY "Permissive All Projects" ON "public"."projects" 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Invoices Policies
CREATE POLICY "Permissive All Invoices" ON "public"."invoices" 
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- (Facultatif) Trigger pour insertion automatique dans profiles lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nom, email)
  VALUES (new.id, split_part(new.email, '@', 1), new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Message de succès
-- La base est prête !
