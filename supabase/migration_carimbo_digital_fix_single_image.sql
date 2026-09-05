-- ============================================================
-- LicitaGov — Carimbo Digital: imagem única (carimbo já inclui a rubrica)
-- Projeto: xqlrfsrjvqmucchzpapk
-- Execute no SQL Editor: https://supabase.com/dashboard/project/xqlrfsrjvqmucchzpapk/sql/new
--
-- Motivo: o carimbo oficial real da prefeitura já vem com a rubrica
-- desenhada dentro da própria imagem (ver G:\Desktop\CARIMBO DIGITAL).
-- Ter um upload separado de "rubrica" fazia o app desenhar duas cópias
-- do carimbo sobrepostas. Este módulo passa a usar uma única imagem.
-- ============================================================

alter table carimbo_config drop column if exists rubrica_image_url;
alter table carimbo_config drop column if exists pos_rubrica_x;
alter table carimbo_config drop column if exists pos_rubrica_y;
alter table carimbo_config drop column if exists rubrica_width_pct;

notify pgrst, 'reload schema';
