-- ============================================================
-- LicitaGov/GovCore — Diário Oficial (módulo de publicação)
-- Projeto: xqlrfsrjvqmucchzpapk
-- Fase 1: cadastro de matérias + fechamento de edição com numeração
-- automática e PDF consolidado. Inspirado no par SIEPO (autoria) / DOEM
-- (leitura) — aqui só a metade de autoria; o portal público é Fase 2.
--
-- Pré-requisito: migration_multitenancy.sql já aplicada em produção —
-- reaproveita as funções current_tenant_id()/is_super_admin()/
-- set_tenant_id_from_auth() criadas por ela, não recria nada disso.
-- ============================================================

-- ── Edições ────────────────────────────────────────────────────
-- Uma edição nasce "rascunho" (aceita matérias) e vira "publicada" no
-- fechamento, quando ganha numero/ano_serie definitivos e o pdf_url.
create table if not exists diario_edicoes (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid,
  data_publicacao date not null default current_date,
  status          text not null default 'rascunho' check (status in ('rascunho', 'publicada')),
  numero          int,
  ano_serie       int,
  pdf_url         text,
  fechada_em      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Matérias ───────────────────────────────────────────────────
-- "Caderno" replica a categorização por tipo de ato vista no DOEM
-- (Decretos, Portarias, Contratos, Licitações...).
create table if not exists diario_materias (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid,
  edicao_id  uuid not null references diario_edicoes(id) on delete cascade,
  caderno    text not null check (caderno in ('decreto','portaria','contrato','licitacao','aviso','despacho','edital','outros')),
  orgao_id   uuid references orgaos(id),
  titulo     text not null,
  corpo      text not null,
  ordem      int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Numeração ──────────────────────────────────────────────────
-- Contador contínuo por tenant — nunca reseta (mesma lógica do
-- "Edição 2.329, Ano 16" do DOEM: numero sobe sempre, ano_serie é
-- avançado manualmente pela prefeitura uma vez por ano, se quiser).
create table if not exists diario_config (
  tenant_id    uuid primary key,
  ultimo_numero int not null default 0,
  ano_serie     int not null default 1
);

-- Incrementa e devolve o próximo (numero, ano_serie) de forma atômica —
-- chamada só pelo endpoint de fechamento (service role), nunca do browser,
-- para não depender de RLS/sessão em concorrência de fechamentos simultâneos.
create or replace function diario_proxima_numeracao(p_tenant_id uuid)
returns table(numero int, ano_serie int)
language plpgsql
as $$
begin
  insert into diario_config (tenant_id, ultimo_numero, ano_serie)
  values (p_tenant_id, 0, 1)
  on conflict (tenant_id) do nothing;

  return query
  update diario_config dc
    set ultimo_numero = dc.ultimo_numero + 1
    where dc.tenant_id = p_tenant_id
    returning dc.ultimo_numero, dc.ano_serie;
end;
$$;

-- ── Trigger: preenche tenant_id sozinho (reusa função já existente) ──
drop trigger if exists trg_set_tenant_id on diario_edicoes;
create trigger trg_set_tenant_id before insert on diario_edicoes
  for each row execute function set_tenant_id_from_auth();

drop trigger if exists trg_set_tenant_id on diario_materias;
create trigger trg_set_tenant_id before insert on diario_materias
  for each row execute function set_tenant_id_from_auth();

-- ── RLS: isolamento por tenant (mesmo padrão de processos/contratos/etc) ──
alter table diario_edicoes  enable row level security;
alter table diario_materias enable row level security;
alter table diario_config   enable row level security;

drop policy if exists tenant_isolation on diario_edicoes;
create policy tenant_isolation on diario_edicoes for all to authenticated
  using (tenant_id = current_tenant_id() or is_super_admin())
  with check (tenant_id = current_tenant_id() or is_super_admin());

drop policy if exists tenant_isolation on diario_materias;
create policy tenant_isolation on diario_materias for all to authenticated
  using (tenant_id = current_tenant_id() or is_super_admin())
  with check (tenant_id = current_tenant_id() or is_super_admin());

drop policy if exists tenant_isolation on diario_config;
create policy tenant_isolation on diario_config for all to authenticated
  using (tenant_id = current_tenant_id() or is_super_admin())
  with check (tenant_id = current_tenant_id() or is_super_admin());

-- Matérias só podem ser inseridas/editadas/excluídas enquanto a edição
-- ainda é rascunho — trava a nível de banco, não só de UI, para uma
-- edição já publicada nunca ser alterada por engano.
create or replace function diario_bloqueia_materia_apos_fechamento()
returns trigger language plpgsql as $$
declare
  v_status text;
begin
  select status into v_status from diario_edicoes where id = coalesce(new.edicao_id, old.edicao_id);
  if v_status = 'publicada' then
    raise exception 'Edição já publicada — não é possível alterar matérias';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_bloqueia_materia on diario_materias;
create trigger trg_bloqueia_materia before insert or update or delete on diario_materias
  for each row execute function diario_bloqueia_materia_apos_fechamento();

-- ── Storage: bucket para o PDF consolidado de cada edição ────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diario-oficial-pdfs',
  'diario-oficial-pdfs',
  true,
  26214400, -- 25 MB
  '{application/pdf}'
)
on conflict (id) do nothing;

drop policy if exists "public read diario oficial pdfs" on storage.objects;
create policy "public read diario oficial pdfs"
on storage.objects for select
to public
using (bucket_id = 'diario-oficial-pdfs');

-- Upload feito exclusivamente pelo endpoint api/diario-fechar.js (service role).

notify pgrst, 'reload schema';
