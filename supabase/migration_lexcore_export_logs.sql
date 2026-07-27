-- ============================================================
-- LexCore — Audit log de exportação de Análise Completa
-- Projeto: xqlrfsrjvqmucchzpapk
-- Execute no SQL Editor: https://supabase.com/dashboard/project/xqlrfsrjvqmucchzpapk/sql/new
--
-- Pré-requisito: migration_multitenancy.sql já aplicada (usa
-- set_tenant_id_from_auth(), current_tenant_id(), is_super_admin()).
-- ============================================================

create table if not exists lexcore_export_logs (
  id            uuid primary key default gen_random_uuid(),
  analise_id    uuid not null references lexcore_analises(id) on delete cascade,
  tenant_id     uuid references tenants(id),
  usuario_id    uuid references auth.users(id),
  usuario_email text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_lexcore_export_logs_analise on lexcore_export_logs(analise_id);
create index if not exists idx_lexcore_export_logs_tenant  on lexcore_export_logs(tenant_id);

alter table lexcore_export_logs enable row level security;

drop trigger if exists trg_set_tenant_id on lexcore_export_logs;
create trigger trg_set_tenant_id before insert on lexcore_export_logs
  for each row execute function set_tenant_id_from_auth();

drop policy if exists tenant_isolation on lexcore_export_logs;
create policy tenant_isolation on lexcore_export_logs for all to authenticated
  using (tenant_id = current_tenant_id() or is_super_admin())
  with check (tenant_id = current_tenant_id() or is_super_admin());

notify pgrst, 'reload schema';
