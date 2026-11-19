-- LicitaGov — Controle de despesas (notas de empenho) dos Contratos
-- Mesma ideia de ata_empenhos (migration_ata_empenhos.sql): cada nota de
-- empenho anexada vira 1 linha; o saldo do contrato é calculado no app como
-- valor do contrato - soma dos empenhos (nada é gravado em contratos).
-- Reaproveita o bucket privado ata-empenhos (pasta {tenant_id}/contrato-{id}/).
-- Aditiva e idempotente.

create table if not exists contrato_empenhos (
  id              uuid primary key default gen_random_uuid(),
  contrato_id     uuid not null references contratos(id) on delete cascade,
  tenant_id       uuid references tenants(id),
  numero          text not null,
  data_emissao    date,
  unidade_gestora text,
  valor           numeric(15,2) not null default 0,
  itens           jsonb not null default '[]'::jsonb,
  observacao      text,
  arquivo_path    text,
  arquivo_nome    text,
  created_by      uuid,
  created_at      timestamptz default now()
);

create index if not exists idx_contrato_empenhos_contrato on contrato_empenhos(contrato_id);
create index if not exists idx_contrato_empenhos_tenant   on contrato_empenhos(tenant_id);

drop trigger if exists trg_set_tenant_id on contrato_empenhos;
create trigger trg_set_tenant_id before insert on contrato_empenhos
  for each row execute function set_tenant_id_from_auth();

alter table contrato_empenhos enable row level security;
drop policy if exists tenant_isolation on contrato_empenhos;
create policy tenant_isolation on contrato_empenhos for all to authenticated
  using (tenant_id = current_tenant_id() or is_super_admin())
  with check (tenant_id = current_tenant_id() or is_super_admin());
