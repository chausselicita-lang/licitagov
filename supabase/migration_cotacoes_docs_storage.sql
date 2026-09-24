-- ============================================================
-- LicitaGov — Storage: bucket para o Mapa Comparativo de Preços (.docx)
-- Projeto: xqlrfsrjvqmucchzpapk
-- Mesmo padrão de migration_lexcore.sql (bucket público de leitura,
-- upload feito exclusivamente pela API via service role).
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cotacoes-docs',
  'cotacoes-docs',
  true,
  26214400, -- 25 MB
  '{application/vnd.openxmlformats-officedocument.wordprocessingml.document}'
)
on conflict (id) do nothing;

drop policy if exists "public read cotacoes docs" on storage.objects;
create policy "public read cotacoes docs"
on storage.objects for select
to public
using (bucket_id = 'cotacoes-docs');

notify pgrst, 'reload schema';
