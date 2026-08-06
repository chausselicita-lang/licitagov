-- ============================================================
-- LicitaGov — Planejamento Assistido por IA (módulo GovCore)
-- Projeto: xqlrfsrjvqmucchzpapk
-- Execute no SQL Editor: https://supabase.com/dashboard/project/xqlrfsrjvqmucchzpapk/sql/new
--
-- Geração em cascata DFD → ETP → TR → Mapa de Riscos, com
-- Verificador de Coerência entre as 4 peças. Substitui o
-- "Agente de Dispensas" (arquivado no final deste arquivo,
-- dados preservados — nada é apagado).
--
-- Isolamento por tenant segue exatamente o padrão já em produção
-- em lexcore_* (migration_multitenancy.sql): tenant_id
-- preenchido sozinho pelo trigger set_tenant_id_from_auth() já
-- existente, RLS com as funções já existentes current_tenant_id()
-- e is_super_admin(). Nenhuma função nova é criada aqui.
-- ============================================================

-- ── 1. Processo de planejamento (intake — 6 campos) ──────────
create table if not exists planejamento_processos (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references tenants(id),
  numero_processo        text,
  objeto                 text not null,
  justificativa_resumida text not null,
  quantidade_estimada    numeric,
  valor_estimado         numeric(14,2),
  area_requisitante      text not null,
  tipo_contratacao       text not null
                           check (tipo_contratacao in ('bens', 'servicos', 'servicos_continuados', 'obras', 'ti', 'saude', 'outros')),
  status                 text not null default 'intake'
                           check (status in ('intake', 'dfd_gerado', 'etp_gerado', 'tr_gerado', 'mapa_riscos_gerado', 'completo')),
  criado_por             uuid references auth.users(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ── 2. DFD — Documento de Formalização da Demanda ────────────
create table if not exists planejamento_dfd (
  id               uuid primary key default gen_random_uuid(),
  processo_id      uuid not null references planejamento_processos(id) on delete cascade,
  tenant_id        uuid not null references tenants(id),
  conteudo_gerado  text not null,
  status           text not null default 'rascunho' check (status in ('rascunho', 'finalizado')),
  versao           int not null default 1,
  arquivo_docx_url text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index if not exists ux_planejamento_dfd_processo on planejamento_dfd(processo_id);

-- ── 3. ETP — Estudo Técnico Preliminar (herda DFD + até 2 perguntas) ──
create table if not exists planejamento_etp (
  id                       uuid primary key default gen_random_uuid(),
  processo_id              uuid not null references planejamento_processos(id) on delete cascade,
  tenant_id                uuid not null references tenants(id),
  perguntas_complementares jsonb not null default '[]', -- [{pergunta, resposta}] — no máx. 2
  conteudo_gerado          text not null,
  status                   text not null default 'rascunho' check (status in ('rascunho', 'finalizado')),
  versao                   int not null default 1,
  arquivo_docx_url         text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create unique index if not exists ux_planejamento_etp_processo on planejamento_etp(processo_id);

-- ── 4. TR — Termo de Referência (herda DFD + ETP) ────────────
create table if not exists planejamento_tr (
  id               uuid primary key default gen_random_uuid(),
  processo_id      uuid not null references planejamento_processos(id) on delete cascade,
  tenant_id        uuid not null references tenants(id),
  conteudo_gerado  text not null,
  status           text not null default 'rascunho' check (status in ('rascunho', 'finalizado')),
  versao           int not null default 1,
  arquivo_docx_url text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index if not exists ux_planejamento_tr_processo on planejamento_tr(processo_id);

-- ── 5. Mapa de Riscos (herda TR) ──────────────────────────────
create table if not exists planejamento_mapa_riscos (
  id               uuid primary key default gen_random_uuid(),
  processo_id      uuid not null references planejamento_processos(id) on delete cascade,
  tenant_id        uuid not null references tenants(id),
  riscos           jsonb not null default '[]',
    -- [{descricao, fase: planejamento|selecao|contratual, probabilidade: baixa|media|alta,
    --   impacto: baixo|medio|alto, acao_preventiva, acao_contingencia, responsavel}]
  conteudo_gerado  text not null,
  status           text not null default 'rascunho' check (status in ('rascunho', 'finalizado')),
  versao           int not null default 1,
  arquivo_docx_url text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index if not exists ux_planejamento_mapa_riscos_processo on planejamento_mapa_riscos(processo_id);

-- ── 6. Verificador de Coerência (cruza as 4 peças sob demanda) ──
create table if not exists planejamento_coerencia_checks (
  id            uuid primary key default gen_random_uuid(),
  processo_id   uuid not null references planejamento_processos(id) on delete cascade,
  tenant_id     uuid not null references tenants(id),
  contradicoes  jsonb not null default '[]',
    -- [{campo, peca_a, valor_a, peca_b, valor_b, severidade: alta|media|baixa, descricao}]
  status_geral  text not null check (status_geral in ('coerente', 'divergencias_encontradas')),
  executado_por uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

-- ── Índices por tenant ────────────────────────────────────────
create index if not exists idx_planejamento_processos_tenant       on planejamento_processos(tenant_id);
create index if not exists idx_planejamento_dfd_tenant              on planejamento_dfd(tenant_id);
create index if not exists idx_planejamento_etp_tenant              on planejamento_etp(tenant_id);
create index if not exists idx_planejamento_tr_tenant               on planejamento_tr(tenant_id);
create index if not exists idx_planejamento_mapa_riscos_tenant      on planejamento_mapa_riscos(tenant_id);
create index if not exists idx_planejamento_coerencia_checks_tenant on planejamento_coerencia_checks(tenant_id);

-- ── Trigger: preenche tenant_id sozinho (reaproveita função já existente) ──
do $$
declare
  tbl text;
  tabelas text[] := array[
    'planejamento_processos', 'planejamento_dfd', 'planejamento_etp',
    'planejamento_tr', 'planejamento_mapa_riscos', 'planejamento_coerencia_checks'
  ];
begin
  foreach tbl in array tabelas loop
    execute format('drop trigger if exists trg_set_tenant_id on %I', tbl);
    execute format(
      'create trigger trg_set_tenant_id before insert on %I for each row execute function set_tenant_id_from_auth()',
      tbl
    );
  end loop;
end $$;

-- ── RLS: isolamento por tenant (mesmo padrão já usado em lexcore_*) ──
do $$
declare
  tbl text;
  tabelas text[] := array[
    'planejamento_processos', 'planejamento_dfd', 'planejamento_etp',
    'planejamento_tr', 'planejamento_mapa_riscos', 'planejamento_coerencia_checks'
  ];
begin
  foreach tbl in array tabelas loop
    execute format('alter table %I enable row level security', tbl);
    execute format('drop policy if exists tenant_isolation on %I', tbl);
    execute format(
      'create policy tenant_isolation on %I for all to authenticated
         using (tenant_id = current_tenant_id() or is_super_admin())
         with check (tenant_id = current_tenant_id() or is_super_admin())',
      tbl
    );
  end loop;
end $$;

-- ── Storage: bucket para os .docx gerados (mesmo padrão do lexcore-docs) ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'planejamento-docs',
  'planejamento-docs',
  true,
  26214400, -- 25 MB
  '{application/vnd.openxmlformats-officedocument.wordprocessingml.document}'
)
on conflict (id) do nothing;

drop policy if exists "public read planejamento docs" on storage.objects;
create policy "public read planejamento docs"
on storage.objects for select
to public
using (bucket_id = 'planejamento-docs');

-- Upload/gerenciamento feito exclusivamente pela API (service role, ignora RLS).

-- ============================================================
-- Arquivamento do módulo "Agente de Dispensas" (descontinuado)
-- Não apaga nada — só marca como arquivado. dispensa_processos
-- e dispensa_logs estão vazias em produção; dispensa_config tem
-- 1 linha (configuração institucional), preservada para consulta.
-- ============================================================
alter table dispensa_processos add column if not exists arquivado_em timestamptz;
alter table dispensa_config    add column if not exists arquivado_em timestamptz;
alter table dispensa_logs      add column if not exists arquivado_em timestamptz;

update dispensa_processos set arquivado_em = now() where arquivado_em is null;
update dispensa_config    set arquivado_em = now() where arquivado_em is null;
update dispensa_logs      set arquivado_em = now() where arquivado_em is null;

notify pgrst, 'reload schema';
