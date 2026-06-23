-- ============================================================
-- LicitaGov — Portal Público: GRANTs explícitos para anon
-- Projeto: xqlrfsrjvqmucchzpapk
-- ============================================================

-- 1. Garantir que anon pode SELECT em todas as tabelas do portal
GRANT SELECT ON processos        TO anon;
GRANT SELECT ON dispensas        TO anon;
GRANT SELECT ON inexigibilidades TO anon;
GRANT SELECT ON atas             TO anon;
GRANT SELECT ON ata_itens        TO anon;
GRANT SELECT ON contratos        TO anon;
GRANT SELECT ON orgaos           TO anon;

-- 2. Recriar policies anon de forma limpa (sem filtro de fase)
DROP POLICY IF EXISTS "portal publico processos"     ON processos;
DROP POLICY IF EXISTS "portal publico processos all" ON processos;
CREATE POLICY "portal anon processos" ON processos
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "portal publico dispensas" ON dispensas;
CREATE POLICY "portal anon dispensas" ON dispensas
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "portal publico inexigibilidades" ON inexigibilidades;
CREATE POLICY "portal anon inexigibilidades" ON inexigibilidades
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "portal publico atas" ON atas;
CREATE POLICY "portal anon atas" ON atas
  FOR SELECT TO anon USING (true);

CREATE POLICY "portal anon ata_itens" ON ata_itens
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "portal publico contratos" ON contratos;
CREATE POLICY "portal anon contratos" ON contratos
  FOR SELECT TO anon USING (true);

-- 3. Recarregar schema PostgREST
NOTIFY pgrst, 'reload schema';
