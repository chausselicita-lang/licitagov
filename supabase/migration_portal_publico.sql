-- ============================================================
-- LicitaGov — Portal Público: tabela orgaos + políticas anon
-- Projeto: xqlrfsrjvqmucchzpapk
-- ============================================================

-- 1. Tabela orgaos (sem RLS — leitura livre)
CREATE TABLE IF NOT EXISTS orgaos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT NOT NULL,
  responsavel  TEXT,
  email        TEXT,
  telefone     TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS desabilitado intencionalmente para leitura pública
ALTER TABLE orgaos DISABLE ROW LEVEL SECURITY;

-- Permissão de leitura para anon e authenticated
GRANT SELECT ON orgaos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON orgaos TO authenticated;

-- 2. Policies públicas (anon) para todas as tabelas do portal
-- processos — TODAS as fases (não só Publicado/Homologado)
DROP POLICY IF EXISTS "portal publico processos"     ON processos;
DROP POLICY IF EXISTS "portal publico processos all" ON processos;
CREATE POLICY "portal publico processos all" ON processos
  FOR SELECT USING (auth.role() = 'anon');

-- dispensas
DROP POLICY IF EXISTS "portal publico dispensas" ON dispensas;
CREATE POLICY "portal publico dispensas" ON dispensas
  FOR SELECT USING (auth.role() = 'anon');

-- inexigibilidades
DROP POLICY IF EXISTS "portal publico inexigibilidades" ON inexigibilidades;
CREATE POLICY "portal publico inexigibilidades" ON inexigibilidades
  FOR SELECT USING (auth.role() = 'anon');

-- atas
DROP POLICY IF EXISTS "portal publico atas" ON atas;
CREATE POLICY "portal publico atas" ON atas
  FOR SELECT USING (auth.role() = 'anon');

-- contratos
DROP POLICY IF EXISTS "portal publico contratos" ON contratos;
CREATE POLICY "portal publico contratos" ON contratos
  FOR SELECT USING (auth.role() = 'anon');

-- 3. Recarregar schema PostgREST
NOTIFY pgrst, 'reload schema';
