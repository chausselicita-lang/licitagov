-- ============================================================
-- LicitaGov — Portal Público: policies anon para Cotações
-- Projeto: xqlrfsrjvqmucchzpapk
-- Necessário para o link de rastreabilidade impresso no Mapa de
-- Preços (aba Cotações) abrir publicamente em /portal?cotacao=<id>,
-- mesmo padrão de migration_portal_publico.sql para as demais tabelas.
-- ============================================================

-- cotacoes (cabeçalho)
DROP POLICY IF EXISTS "portal publico cotacoes" ON cotacoes;
CREATE POLICY "portal publico cotacoes" ON cotacoes
  FOR SELECT USING (auth.role() = 'anon');

-- cot_fornecedores (necessário para o join embutido do PostgREST)
DROP POLICY IF EXISTS "portal publico cot_fornecedores" ON cot_fornecedores;
CREATE POLICY "portal publico cot_fornecedores" ON cot_fornecedores
  FOR SELECT USING (auth.role() = 'anon');

-- cot_itens
DROP POLICY IF EXISTS "portal publico cot_itens" ON cot_itens;
CREATE POLICY "portal publico cot_itens" ON cot_itens
  FOR SELECT USING (auth.role() = 'anon');

-- cot_valores
DROP POLICY IF EXISTS "portal publico cot_valores" ON cot_valores;
CREATE POLICY "portal publico cot_valores" ON cot_valores
  FOR SELECT USING (auth.role() = 'anon');

-- cot_fontes_ia (fontes de pesquisa de mercado — parte da rastreabilidade)
DROP POLICY IF EXISTS "portal publico cot_fontes_ia" ON cot_fontes_ia;
CREATE POLICY "portal publico cot_fontes_ia" ON cot_fontes_ia
  FOR SELECT USING (auth.role() = 'anon');

-- Recarregar schema PostgREST
NOTIFY pgrst, 'reload schema';
