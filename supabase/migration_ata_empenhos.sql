-- LicitaGov — Controle de despesas (notas de empenho) da Ata de Registro de Preços
--
-- Cada nota de empenho anexada a uma ata vira 1 linha em ata_empenhos.
-- O app abate o valor do saldo da ata (atas.saldo_disponivel) e a quantidade
-- consumida de cada item (ata_itens.qtd_utilizada); ao excluir o empenho,
-- o app devolve o saldo. O PDF original fica num bucket PRIVADO
-- (ata-empenhos), em {tenant_id}/{ata_id}/arquivo.pdf.
--
-- Aditiva: não altera nenhuma tabela existente. Idempotente (pode rodar de novo).

-- ── 1. Tabela ────────────────────────────────────────────────
create table if not exists ata_empenhos (
  id              uuid primary key default gen_random_uuid(),
  ata_id          uuid not null references atas(id) on delete cascade,
  tenant_id       uuid references tenants(id),
  numero          text not null,                 -- nº do empenho (ex.: 2026NE000123)
  data_emissao    date,
  unidade_gestora text,                          -- secretaria / unidade que empenhou
  valor           numeric(15,2) not null default 0,
  itens           jsonb not null default '[]'::jsonb,
                                                 -- [{ataItemId, descricao, unidade, qtd, valorUnit}]
  observacao      text,
  arquivo_path    text,                          -- caminho no bucket ata-empenhos
  arquivo_nome    text,
  created_by      uuid,
  created_at      timestamptz default now()
);

create index if not exists idx_ata_empenhos_ata    on ata_empenhos(ata_id);
create index if not exists idx_ata_empenhos_tenant on ata_empenhos(tenant_id);

-- Preenche tenant_id sozinho no INSERT (mesmo padrão das demais tabelas)
drop trigger if exists trg_set_tenant_id on ata_empenhos;
create trigger trg_set_tenant_id before insert on ata_empenhos
  for each row execute function set_tenant_id_from_auth();

-- ── 2. RLS: isolamento por tenant (super_admin enxerga tudo) ─
alter table ata_empenhos enable row level security;
drop policy if exists tenant_isolation on ata_empenhos;
create policy tenant_isolation on ata_empenhos for all to authenticated
  using (tenant_id = current_tenant_id() or is_super_admin())
  with check (tenant_id = current_tenant_id() or is_super_admin());

-- ── 3. Storage: bucket privado ata-empenhos ──────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ata-empenhos',
  'ata-empenhos',
  false,            -- privado: acesso só por URL assinada
  10485760,         -- 10 MB por arquivo
  '{application/pdf}'
)
on conflict (id) do nothing;

drop policy if exists "tenant read ata empenhos" on storage.objects;
create policy "tenant read ata empenhos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'ata-empenhos'
  and ((storage.foldername(name))[1] = current_tenant_id()::text or is_super_admin())
);

drop policy if exists "tenant insert ata empenhos" on storage.objects;
create policy "tenant insert ata empenhos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'ata-empenhos'
  and ((storage.foldername(name))[1] = current_tenant_id()::text or is_super_admin())
);

drop policy if exists "tenant delete ata empenhos" on storage.objects;
create policy "tenant delete ata empenhos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'ata-empenhos'
  and ((storage.foldername(name))[1] = current_tenant_id()::text or is_super_admin())
);
