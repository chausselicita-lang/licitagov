-- ============================================================
-- LicitaGov — LexCore (módulo GovCore)
-- Projeto: xqlrfsrjvqmucchzpapk
-- Analisa editais frente à Lei 14.133/2021 e gera peças jurídicas
-- (Impugnação, Razões de Recurso, Contrarrazões, Petições).
--
-- Nota de adaptação ao schema real do GovCore: este projeto NÃO possui
-- tabela "tenants" nem particionamento por tenant_id nas tabelas de dados
-- (processos, dispensas, ata_itens etc. usam a policy simples "allow_auth",
-- liberada para qualquer usuário autenticado — ver supabase/schema.sql e
-- migration_agente_dispensas.sql). O LexCore segue o MESMO padrão já
-- validado em produção, em vez do schema multi-tenant genérico do prompt
-- original. Isolamento por prefeitura/tenant_id pode ser adicionado depois,
-- no mesmo momento em que for introduzido nas demais tabelas.
-- ============================================================

-- ── Análises de edital ────────────────────────────────────────
create table if not exists lexcore_analises (
  id                   uuid primary key default gen_random_uuid(),
  nome_edital          text not null,
  numero_processo      text,
  arquivo_original_url text,
  texto_extraido       text,
  status               text not null default 'processando'
                         check (status in ('processando', 'concluida', 'erro')),
  mensagem_erro        text,
  criado_por           uuid references auth.users(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── Pontos críticos identificados na análise ─────────────────
create table if not exists lexcore_pontos_criticos (
  id                  uuid primary key default gen_random_uuid(),
  analise_id          uuid not null references lexcore_analises(id) on delete cascade,
  trecho_edital       text not null,
  tipo_problema       text not null
                        check (tipo_problema in ('restritivo', 'ilegal', 'dubio', 'risco_baixo')),
  descricao_problema  text not null,
  fundamentacao_legal text not null,
  artigo_lei          text,
  nivel_risco         text not null check (nivel_risco in ('alto', 'medio', 'baixo')),
  selecionado         boolean default false,
  created_at          timestamptz not null default now()
);

-- ── Peças jurídicas geradas ───────────────────────────────────
create table if not exists lexcore_pecas (
  id                  uuid primary key default gen_random_uuid(),
  analise_id          uuid not null references lexcore_analises(id) on delete cascade,
  tipo_peca           text not null
                        check (tipo_peca in ('impugnacao', 'razoes_recurso', 'contrarrazoes', 'peticao')),
  pontos_criticos_ids uuid[] default '{}',
  conteudo_gerado     text not null,
  status              text not null default 'rascunho' check (status in ('rascunho', 'finalizada')),
  versao              int not null default 1,
  arquivo_docx_url    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── RLS (mesmo padrão simples já usado nas demais tabelas) ───
alter table lexcore_analises        enable row level security;
alter table lexcore_pontos_criticos enable row level security;
alter table lexcore_pecas           enable row level security;

drop policy if exists allow_auth on lexcore_analises;
create policy allow_auth on lexcore_analises        for all to authenticated using (true) with check (true);

drop policy if exists allow_auth on lexcore_pontos_criticos;
create policy allow_auth on lexcore_pontos_criticos for all to authenticated using (true) with check (true);

drop policy if exists allow_auth on lexcore_pecas;
create policy allow_auth on lexcore_pecas           for all to authenticated using (true) with check (true);

-- ── Storage: bucket para o edital original e as peças (.docx) ─
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lexcore-docs',
  'lexcore-docs',
  true,
  26214400, -- 25 MB
  '{application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document}'
)
on conflict (id) do nothing;

drop policy if exists "public read lexcore docs" on storage.objects;
create policy "public read lexcore docs"
on storage.objects for select
to public
using (bucket_id = 'lexcore-docs');

-- Upload/gerenciamento feito exclusivamente pela API (service role, ignora RLS).

notify pgrst, 'reload schema';
