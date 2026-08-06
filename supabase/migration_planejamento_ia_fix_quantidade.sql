-- ============================================================
-- LicitaGov — Planejamento Assistido por IA — correção de schema
-- Projeto: xqlrfsrjvqmucchzpapk
-- Execute no SQL Editor: https://supabase.com/dashboard/project/xqlrfsrjvqmucchzpapk/sql/new
--
-- Bug encontrado no teste end-to-end (Task 10): quantidade_estimada foi
-- criada como "numeric" em migration_planejamento_ia.sql, mas o campo de
-- intake é texto livre ("45 itens", "12 meses de serviço continuado", "1
-- lote de material permanente") — os próprios prompts de geração (DFD/ETP)
-- já tratam esse campo como texto descritivo, não número puro. Qualquer
-- valor com letra quebrava o INSERT. Corrige o tipo da coluna para text.
-- ============================================================

alter table planejamento_processos
  alter column quantidade_estimada type text using quantidade_estimada::text;

notify pgrst, 'reload schema';
