-- ============================================================
-- LicitaGov — Carimbo Digital de Numeração de Folhas
-- Projeto: xqlrfsrjvqmucchzpapk
-- Execute no SQL Editor: https://supabase.com/dashboard/project/xqlrfsrjvqmucchzpapk/sql/new
--
-- O que esta migration faz:
--   1. Cria `carimbo_config` — 1 registro por tenant com os PNGs (carimbo +
--      rubrica) e as posições/tamanhos salvos no editor visual.
--   2. Cria `carimbo_processamentos` — histórico de carimbagens feitas.
--   3. Cria o bucket `carimbo-assets` (público, só imagens) seguindo o
--      mesmo padrão dos outros buckets do projeto (lexcore-docs,
--      checklist-pdfs etc): leitura pública, mas escrita restrita —
--      aqui, restrita à própria pasta {tenant_id}/ do usuário autenticado.
--   4. Aplica o mesmo padrão de isolamento (tenant_isolation +
--      trg_set_tenant_id) já usado em todas as outras tabelas de negócio.
-- ============================================================

-- ── 1. carimbo_config ────────────────────────────────────────
create table if not exists carimbo_config (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id),
  carimbo_image_url   text not null,
  rubrica_image_url   text not null,
  pos_carimbo_x       numeric not null default 0.75,
  pos_carimbo_y       numeric not null default 0.05,
  carimbo_width_pct   numeric not null default 0.18,
  pos_numero_x        numeric not null default 0.5,
  pos_numero_y        numeric not null default 0.42,
  numero_font_size    numeric not null default 14,
  numero_color        text not null default '#1a1a6e',
  pos_rubrica_x       numeric not null default 0.5,
  pos_rubrica_y       numeric not null default 0.68,
  rubrica_width_pct   numeric not null default 0.35,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists ux_carimbo_config_tenant on carimbo_config(tenant_id);

alter table carimbo_config enable row level security;
drop policy if exists tenant_isolation on carimbo_config;
create policy tenant_isolation on carimbo_config for all to authenticated
  using (tenant_id = current_tenant_id() or is_super_admin())
  with check (tenant_id = current_tenant_id() or is_super_admin());

drop trigger if exists trg_set_tenant_id on carimbo_config;
create trigger trg_set_tenant_id before insert on carimbo_config
  for each row execute function set_tenant_id_from_auth();

-- ── 2. carimbo_processamentos ────────────────────────────────
create table if not exists carimbo_processamentos (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id),
  nome_arquivo    text not null,
  total_folhas    integer not null,
  numero_inicial  integer not null,
  numero_final    integer not null,
  storage_path    text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create index if not exists idx_carimbo_processamentos_tenant on carimbo_processamentos(tenant_id);

alter table carimbo_processamentos enable row level security;
drop policy if exists tenant_isolation on carimbo_processamentos;
create policy tenant_isolation on carimbo_processamentos for all to authenticated
  using (tenant_id = current_tenant_id() or is_super_admin())
  with check (tenant_id = current_tenant_id() or is_super_admin());

drop trigger if exists trg_set_tenant_id on carimbo_processamentos;
create trigger trg_set_tenant_id before insert on carimbo_processamentos
  for each row execute function set_tenant_id_from_auth();

-- ── 3. Storage: bucket carimbo-assets ────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'carimbo-assets',
  'carimbo-assets',
  true,
  2097152, -- 2 MB por imagem
  '{image/png}'
)
on conflict (id) do nothing;

drop policy if exists "public read carimbo assets" on storage.objects;
create policy "public read carimbo assets"
on storage.objects for select
to public
using (bucket_id = 'carimbo-assets');

-- Upload/update/delete só dentro da própria pasta {tenant_id}/ do usuário
-- autenticado (ou super_admin, em qualquer pasta) — path esperado:
-- carimbo-assets/{tenant_id}/carimbo.png e carimbo-assets/{tenant_id}/rubrica.png
drop policy if exists "tenant manage own carimbo assets" on storage.objects;
create policy "tenant manage own carimbo assets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'carimbo-assets'
  and ((storage.foldername(name))[1] = current_tenant_id()::text or is_super_admin())
);

drop policy if exists "tenant update own carimbo assets" on storage.objects;
create policy "tenant update own carimbo assets"
on storage.objects for update
to authenticated
using (
  bucket_id = 'carimbo-assets'
  and ((storage.foldername(name))[1] = current_tenant_id()::text or is_super_admin())
);

drop policy if exists "tenant delete own carimbo assets" on storage.objects;
create policy "tenant delete own carimbo assets"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'carimbo-assets'
  and ((storage.foldername(name))[1] = current_tenant_id()::text or is_super_admin())
);

-- ── 4. Bucket para os PDFs carimbados finais (histórico) ─────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'carimbo-processados',
  'carimbo-processados',
  true,
  524288000, -- 500 MB (processos grandes, milhares de páginas)
  '{application/pdf}'
)
on conflict (id) do nothing;

drop policy if exists "public read carimbo processados" on storage.objects;
create policy "public read carimbo processados"
on storage.objects for select
to public
using (bucket_id = 'carimbo-processados');

drop policy if exists "tenant upload carimbo processados" on storage.objects;
create policy "tenant upload carimbo processados"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'carimbo-processados'
  and ((storage.foldername(name))[1] = current_tenant_id()::text or is_super_admin())
);

drop policy if exists "tenant delete carimbo processados" on storage.objects;
create policy "tenant delete carimbo processados"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'carimbo-processados'
  and ((storage.foldername(name))[1] = current_tenant_id()::text or is_super_admin())
);

-- ── 5. Recarregar schema PostgREST ────────────────────────────
notify pgrst, 'reload schema';
