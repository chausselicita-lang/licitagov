-- ============================================================
-- LicitaGov — Agente de Dispensas (módulo inicial)
-- Projeto: xqlrfsrjvqmucchzpapk
-- Escopo: somente Dispensa de Licitação (Art. 75, II, Lei 14.133/2021)
-- ============================================================

-- ── Configuração institucional (dados fixos reutilizados em todo processo) ──
create table if not exists dispensa_config (
  id                      uuid primary key default gen_random_uuid(),
  municipio               text not null default '',
  uf                      text not null default '',
  cnpj_municipio          text default '',
  endereco                text default '',
  cep                     text default '',
  email_licitacao         text default '',
  prefeito_nome           text default '',
  prefeito_cpf            text default '',
  agente_contratacao_nome text default '',
  agente_contratacao_matricula text default '',
  procurador_nome         text default '',
  procurador_oab          text default '',
  secretario_financas_nome text default '',
  portaria_agente         text default '',
  decreto_municipal       text default '',
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ── Processos de Dispensa gerados pelo Agente ────────────────
create table if not exists dispensa_processos (
  id                    uuid primary key default gen_random_uuid(),
  numero_processo       text,
  numero_dispensa       text,
  objeto                text not null,
  tipo_objeto           text not null default 'compras_servicos'
                          check (tipo_objeto in ('compras_servicos','obras_engenharia')),
  valor_estimado        numeric(15,2) not null default 0,
  prazo_execucao        text default '',
  unidade_gestora       text default '',
  status                text not null default 'Rascunho'
                          check (status in ('Rascunho','Validado','Bloqueado','Gerado','Concluído')),
  limite_legal          numeric(15,2),
  excede_limite         boolean default false,
  fundamentacao_legal   text default '',
  dados_complementares  jsonb default '{}'::jsonb,
  docx_url              text,
  pdf_url               text,
  created_by            text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ── Log de auditoria (validações, gerações, edições) ─────────
create table if not exists dispensa_logs (
  id           uuid primary key default gen_random_uuid(),
  processo_id  uuid references dispensa_processos(id) on delete cascade,
  evento       text not null,
  detalhes     jsonb default '{}'::jsonb,
  usuario      text,
  created_at   timestamptz default now()
);

-- ── RLS (mesmo padrão simples já usado nas demais tabelas) ───
alter table dispensa_config     enable row level security;
alter table dispensa_processos  enable row level security;
alter table dispensa_logs       enable row level security;

drop policy if exists allow_auth on dispensa_config;
create policy allow_auth on dispensa_config    for all to authenticated using (true) with check (true);

drop policy if exists allow_auth on dispensa_processos;
create policy allow_auth on dispensa_processos for all to authenticated using (true) with check (true);

drop policy if exists allow_auth on dispensa_logs;
create policy allow_auth on dispensa_logs      for all to authenticated using (true) with check (true);

-- ── Storage: bucket para os arquivos gerados (.docx/.pdf) ────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dispensas-docs',
  'dispensas-docs',
  true,
  26214400, -- 25 MB
  '{application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document}'
)
on conflict (id) do nothing;

drop policy if exists "public read dispensas docs" on storage.objects;
create policy "public read dispensas docs"
on storage.objects for select
to public
using (bucket_id = 'dispensas-docs');

-- Upload/gerenciamento feito exclusivamente pela API (service role, ignora RLS).

notify pgrst, 'reload schema';
