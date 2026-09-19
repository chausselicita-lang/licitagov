-- ============================================================
-- LicitaGov — Base de Conhecimento IA (RAG) para os agentes do
-- Planejamento Assistido por IA (DFD → ETP → TR → Mapa de Riscos)
-- Projeto: xqlrfsrjvqmucchzpapk
-- Execute no SQL Editor: https://supabase.com/dashboard/project/xqlrfsrjvqmucchzpapk/sql/new
--
-- Isolamento por tenant segue exatamente o padrão já em produção em
-- planejamento_* (migration_planejamento_ia.sql): tenant_id + RLS com
-- current_tenant_id()/is_super_admin() já existentes. Nenhuma função de
-- permissão nova é criada aqui.
--
-- PASSO MANUAL OBRIGATÓRIO (depois de fazer o deploy de api/rag-index.js
-- no Vercel e gerar um segredo aleatório para RAG_WEBHOOK_SECRET):
--   alter database postgres set app.settings.rag_webhook_url = 'https://SEU-DOMINIO-VERCEL.vercel.app';
--   alter database postgres set app.settings.rag_webhook_secret = 'MESMO-VALOR-DE-RAG_WEBHOOK_SECRET-NO-VERCEL';
-- Enquanto essas duas configurações não forem definidas, o trigger de
-- alimentação contínua simplesmente não dispara (não bloqueia nem falha
-- o UPDATE original — ver rag_notificar_index() abaixo).
-- ============================================================

create extension if not exists vector;
create extension if not exists pg_net;

-- ── 1. Tabela da base de conhecimento ────────────────────────
create table if not exists agentes_base_conhecimento (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id),
  processo_id      uuid not null references planejamento_processos(id) on delete cascade,
  peca_id          uuid not null, -- id da linha em planejamento_dfd/etp/tr/mapa_riscos (sem FK única: a tabela de origem varia por tipo_documento)
  tipo_documento   text not null check (tipo_documento in ('DFD', 'ETP', 'TR', 'MAPA_RISCO')),
  tipo_contratacao text, -- copiado de planejamento_processos.tipo_contratacao — filtro leve opcional, não obrigatório
  conteudo_texto   text not null,
  embedding        vector(1536), -- null quando status = 'descartado' (ex.: conteúdo curto demais para indexar)
  status           text not null default 'aprovado' check (status in ('aprovado', 'descartado')),
  created_at       timestamptz not null default now(),
  unique (processo_id, tipo_documento) -- garante idempotência: carga retroativa e trigger contínuo sempre fazem upsert
);

create index if not exists idx_agentes_base_conhecimento_embedding
  on agentes_base_conhecimento using hnsw (embedding vector_cosine_ops)
  where status = 'aprovado';
create index if not exists idx_agentes_base_conhecimento_tenant on agentes_base_conhecimento(tenant_id);
create index if not exists idx_agentes_base_conhecimento_processo on agentes_base_conhecimento(processo_id);

-- ── Trigger: preenche tenant_id sozinho (reaproveita função já existente) ──
drop trigger if exists trg_set_tenant_id on agentes_base_conhecimento;
create trigger trg_set_tenant_id before insert on agentes_base_conhecimento
  for each row execute function set_tenant_id_from_auth();

-- ── RLS: isolamento por tenant (mesmo padrão de planejamento_*) ──
alter table agentes_base_conhecimento enable row level security;
drop policy if exists tenant_isolation on agentes_base_conhecimento;
create policy tenant_isolation on agentes_base_conhecimento for all to authenticated
  using (tenant_id = current_tenant_id() or is_super_admin())
  with check (tenant_id = current_tenant_id() or is_super_admin());

-- ── 2. View: peças finalizadas ainda não indexadas ───────────
-- Usada pela carga retroativa (api/rag-sync-batch.js) e pelo painel de
-- monitoramento. Uma peça só desaparece daqui quando ganha QUALQUER linha
-- em agentes_base_conhecimento (aprovado OU descartado) — isso evita que
-- peças com conteúdo curto/inválido fiquem sendo tentadas pra sempre.
create or replace view rag_pecas_pendentes as
  select 'DFD' as tipo_documento, d.id as peca_id, d.processo_id, d.tenant_id,
         d.conteudo_gerado as conteudo_texto, p.tipo_contratacao, d.updated_at
  from planejamento_dfd d
  join planejamento_processos p on p.id = d.processo_id
  where d.status = 'finalizado'
    and not exists (select 1 from agentes_base_conhecimento b where b.processo_id = d.processo_id and b.tipo_documento = 'DFD')
  union all
  select 'ETP', e.id, e.processo_id, e.tenant_id, e.conteudo_gerado, p.tipo_contratacao, e.updated_at
  from planejamento_etp e
  join planejamento_processos p on p.id = e.processo_id
  where e.status = 'finalizado'
    and not exists (select 1 from agentes_base_conhecimento b where b.processo_id = e.processo_id and b.tipo_documento = 'ETP')
  union all
  select 'TR', t.id, t.processo_id, t.tenant_id, t.conteudo_gerado, p.tipo_contratacao, t.updated_at
  from planejamento_tr t
  join planejamento_processos p on p.id = t.processo_id
  where t.status = 'finalizado'
    and not exists (select 1 from agentes_base_conhecimento b where b.processo_id = t.processo_id and b.tipo_documento = 'TR')
  union all
  select 'MAPA_RISCO', m.id, m.processo_id, m.tenant_id, m.conteudo_gerado, p.tipo_contratacao, m.updated_at
  from planejamento_mapa_riscos m
  join planejamento_processos p on p.id = m.processo_id
  where m.status = 'finalizado'
    and not exists (select 1 from agentes_base_conhecimento b where b.processo_id = m.processo_id and b.tipo_documento = 'MAPA_RISCO')
  order by updated_at asc;

-- ── 3. View: estatísticas para o painel de monitoramento ─────
create or replace view rag_stats_por_tenant as
  select tenant_id, tipo_documento, status, count(*) as total
  from agentes_base_conhecimento
  group by tenant_id, tipo_documento, status;

-- ── 4. Função de busca por similaridade (few-shot retrieval) ──
-- security invoker (padrão): a RLS de agentes_base_conhecimento continua
-- valendo com o usuário chamador — p_tenant_id é passado explicitamente
-- pelo client (mesmo padrão de getTenantScope()/withTenantScope() já usado
-- em toda a app para o caso de impersonação pelo super_admin).
create or replace function rag_buscar_similares(
  p_tipo_documento text,
  p_embedding vector(1536),
  p_tenant_id uuid default null,
  p_tipo_contratacao text default null,
  p_limit int default 3
) returns table (conteudo_texto text, tipo_contratacao text)
language sql stable
as $$
  select b.conteudo_texto, b.tipo_contratacao
  from agentes_base_conhecimento b
  where b.tipo_documento = p_tipo_documento
    and b.status = 'aprovado'
    and b.embedding is not null
    and (p_tenant_id is null or b.tenant_id = p_tenant_id)
    and (p_tipo_contratacao is null or b.tipo_contratacao = p_tipo_contratacao)
  order by b.embedding <=> p_embedding
  limit p_limit;
$$;

grant execute on function rag_buscar_similares(text, vector, uuid, text, int) to authenticated;

-- ── 5. Alimentação contínua: trigger assíncrono (pg_net) ──────
-- Dispara quando uma peça muda de status pra 'finalizado' (é o que já
-- acontece hoje em api/planejamento-exportar.js). Roda via pg_net, que é
-- assíncrono por natureza: o UPDATE original nunca espera a resposta do
-- webhook nem falha se o webhook cair.
create or replace function rag_notificar_index() returns trigger
language plpgsql as $$
declare
  webhook_url text := current_setting('app.settings.rag_webhook_url', true);
  webhook_secret text := current_setting('app.settings.rag_webhook_secret', true);
begin
  if webhook_url is null or webhook_secret is null or webhook_url = '' or webhook_secret = '' then
    return new; -- webhook ainda não configurado — não bloqueia o UPDATE
  end if;
  perform net.http_post(
    url := webhook_url || '/api/rag-index',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-rag-secret', webhook_secret),
    body := jsonb_build_object('tabela', TG_TABLE_NAME, 'peca_id', new.id)
  );
  return new;
end;
$$;

do $$
declare
  tbl text;
  tabelas text[] := array['planejamento_dfd', 'planejamento_etp', 'planejamento_tr', 'planejamento_mapa_riscos'];
begin
  foreach tbl in array tabelas loop
    execute format('drop trigger if exists trg_rag_notificar_index on %I', tbl);
    execute format(
      'create trigger trg_rag_notificar_index after update of status on %I
         for each row when (new.status = ''finalizado'' and old.status is distinct from ''finalizado'')
         execute function rag_notificar_index()',
      tbl
    );
  end loop;
end $$;

notify pgrst, 'reload schema';
