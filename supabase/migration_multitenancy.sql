-- ============================================================
-- LicitaGov — Multi-tenancy real (Onboarding de Clientes)
-- Projeto: xqlrfsrjvqmucchzpapk
-- Execute no SQL Editor: https://supabase.com/dashboard/project/xqlrfsrjvqmucchzpapk/sql/new
--
-- O que esta migration faz:
--   1. Cria a tabela `tenants` (hoje inexistente — cada prefeitura tinha só um
--      UUID solto e vestigial em user_profiles.tenant_id, nunca usado para
--      filtrar nada).
--   2. Cria 1 tenant por prefeitura ('cliente') já cadastrada e reaponta
--      user_profiles.tenant_id pro tenant real.
--   3. Adiciona tenant_id em todas as tabelas de negócio.
--   4. Faz backfill automático do tenant_id nas linhas já existentes.
--   5. Cria um trigger (set_tenant_id_from_auth) que preenche tenant_id
--      sozinho em todo INSERT feito pelo usuário logado — assim NENHUMA
--      tela existente do app (Processos, Atas, Contratos, Dispensas,
--      Cotações, LexCore, Checklist etc.) precisa ser reescrita para passar
--      tenant_id manualmente; o banco resolve isso na escrita.
--   6. Troca a policy aberta "allow_auth" (qualquer autenticado vê tudo) por
--      isolamento real por tenant, com bypass total para super_admin.
--   7. Preserva as policies "anon" já existentes do Portal Público (não são
--      tocadas — o portal continua público e sem tenant, por fora do RLS
--      de authenticated).
--   8. NOTIFY pgrst reload schema no final.
-- ============================================================

-- ── 0. Correção de bug crítico pré-existente ─────────────────────────────
-- A policy "super admin ve todos" (migration_rbac.sql) consulta user_profiles
-- DENTRO de uma policy da própria user_profiles — isso causa
-- "infinite recursion detected in policy for relation user_profiles" (42P17)
-- assim que o Postgres tenta reavaliar a policy recursivamente. Na prática
-- isso QUEBRA o login do super_admin (a query que busca o próprio perfil
-- falha com 500), e quebraria TAMBÉM todas as novas policies de tenant
-- abaixo, já que todas consultam user_profiles. Corrigido com funções
-- security definer (mesmo padrão recomendado pela documentação do Supabase
-- para evitar policies autorreferentes), que fazem essa leitura ignorando a
-- RLS de user_profiles em vez de reavaliá-la.
create or replace function is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_profiles where id = auth.uid() and role = 'super_admin');
$$;

create or replace function current_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from user_profiles where id = auth.uid();
$$;

drop policy if exists "super admin ve todos" on user_profiles;
create policy "super admin ve todos" on user_profiles
  for all using (is_super_admin());

-- ── 1. Tabela tenants ─────────────────────────────────────────
create table if not exists tenants (
  id                    uuid primary key default gen_random_uuid(),
  nome                  text not null,
  municipio             text,
  uf                    text,
  cnpj                  text,
  responsavel_nome      text,
  responsavel_telefone  text,
  email_institucional   text,
  ativo                 boolean not null default true,
  created_at            timestamptz not null default now()
);

alter table tenants enable row level security;

drop policy if exists tenant_super_admin_all on tenants;
create policy tenant_super_admin_all on tenants for all to authenticated
  using (is_super_admin())
  with check (is_super_admin());

drop policy if exists tenant_self_read on tenants;
create policy tenant_self_read on tenants for select to authenticated
  using (id = current_tenant_id());

-- ── 2. Backfill: 1 tenant real por prefeitura ('cliente') já cadastrada ──
do $$
declare
  r record;
  new_tenant_id uuid;
begin
  for r in select * from user_profiles where role = 'cliente' loop
    insert into tenants (nome, municipio, ativo, created_at)
    values (
      coalesce(nullif(r.prefeitura_nome, ''), r.email),
      r.prefeitura_municipio,
      coalesce(r.ativo, true),
      coalesce(r.created_at, now())
    )
    returning id into new_tenant_id;

    update user_profiles set tenant_id = new_tenant_id where id = r.id;
  end loop;
end $$;

-- ── 3. Adicionar tenant_id (nullable) + índice em cada tabela ────────────
alter table processos             add column if not exists tenant_id uuid references tenants(id);
alter table atas                  add column if not exists tenant_id uuid references tenants(id);
alter table ata_itens              add column if not exists tenant_id uuid references tenants(id);
alter table contratos              add column if not exists tenant_id uuid references tenants(id);
alter table dispensas              add column if not exists tenant_id uuid references tenants(id);
alter table inexigibilidades       add column if not exists tenant_id uuid references tenants(id);
alter table cotacoes               add column if not exists tenant_id uuid references tenants(id);
alter table cot_fornecedores       add column if not exists tenant_id uuid references tenants(id);
alter table cot_itens              add column if not exists tenant_id uuid references tenants(id);
alter table cot_valores            add column if not exists tenant_id uuid references tenants(id);
alter table cot_fontes_ia          add column if not exists tenant_id uuid references tenants(id);
alter table dispensa_config        add column if not exists tenant_id uuid references tenants(id);
alter table dispensa_processos     add column if not exists tenant_id uuid references tenants(id);
alter table dispensa_logs          add column if not exists tenant_id uuid references tenants(id);
alter table lexcore_analises       add column if not exists tenant_id uuid references tenants(id);
alter table lexcore_pontos_criticos add column if not exists tenant_id uuid references tenants(id);
alter table lexcore_pecas          add column if not exists tenant_id uuid references tenants(id);
alter table lexcore_respostas      add column if not exists tenant_id uuid references tenants(id);
alter table checklist_habilitacao  add column if not exists tenant_id uuid references tenants(id);
alter table orgaos                 add column if not exists tenant_id uuid references tenants(id);

create index if not exists idx_processos_tenant             on processos(tenant_id);
create index if not exists idx_atas_tenant                  on atas(tenant_id);
create index if not exists idx_ata_itens_tenant              on ata_itens(tenant_id);
create index if not exists idx_contratos_tenant              on contratos(tenant_id);
create index if not exists idx_dispensas_tenant              on dispensas(tenant_id);
create index if not exists idx_inexigibilidades_tenant       on inexigibilidades(tenant_id);
create index if not exists idx_cotacoes_tenant               on cotacoes(tenant_id);
create index if not exists idx_cot_fornecedores_tenant       on cot_fornecedores(tenant_id);
create index if not exists idx_cot_itens_tenant              on cot_itens(tenant_id);
create index if not exists idx_cot_valores_tenant            on cot_valores(tenant_id);
create index if not exists idx_cot_fontes_ia_tenant          on cot_fontes_ia(tenant_id);
create index if not exists idx_dispensa_config_tenant        on dispensa_config(tenant_id);
create index if not exists idx_dispensa_processos_tenant     on dispensa_processos(tenant_id);
create index if not exists idx_dispensa_logs_tenant          on dispensa_logs(tenant_id);
create index if not exists idx_lexcore_analises_tenant       on lexcore_analises(tenant_id);
create index if not exists idx_lexcore_pontos_criticos_tenant on lexcore_pontos_criticos(tenant_id);
create index if not exists idx_lexcore_pecas_tenant          on lexcore_pecas(tenant_id);
create index if not exists idx_lexcore_respostas_tenant      on lexcore_respostas(tenant_id);
create index if not exists idx_checklist_habilitacao_tenant  on checklist_habilitacao(tenant_id);
create index if not exists idx_orgaos_tenant                 on orgaos(tenant_id);

-- 1 configuração institucional por tenant (partial unique — não conflita com linhas ainda sem tenant_id)
create unique index if not exists ux_dispensa_config_tenant on dispensa_config(tenant_id) where tenant_id is not null;

-- ── 4. Backfill das tabelas de topo (só quando existe exatamente 1 tenant) ──
do $$
declare
  only_tenant uuid;
  tenant_count int;
begin
  select count(*) into tenant_count from tenants;

  if tenant_count = 1 then
    select id into only_tenant from tenants limit 1;

    update processos            set tenant_id = only_tenant where tenant_id is null;
    update atas                 set tenant_id = only_tenant where tenant_id is null;
    update contratos             set tenant_id = only_tenant where tenant_id is null;
    update dispensas             set tenant_id = only_tenant where tenant_id is null;
    update inexigibilidades      set tenant_id = only_tenant where tenant_id is null;
    update cotacoes              set tenant_id = only_tenant where tenant_id is null;
    update dispensa_config       set tenant_id = only_tenant where tenant_id is null;
    update dispensa_processos    set tenant_id = only_tenant where tenant_id is null;
    update lexcore_analises      set tenant_id = only_tenant where tenant_id is null;
    update lexcore_respostas     set tenant_id = only_tenant where tenant_id is null;
    update checklist_habilitacao set tenant_id = only_tenant where tenant_id is null;
    update orgaos                set tenant_id = only_tenant where tenant_id is null;
  else
    raise notice 'Encontrados % tenants (esperado 1 para backfill automático). Tabelas de topo NÃO foram preenchidas automaticamente — associe tenant_id manualmente por prefeitura antes de exigir NOT NULL.', tenant_count;
  end if;
end $$;

-- ── 5. Backfill das tabelas-filhas a partir do pai (independe do passo 4) ──
update ata_itens ai
  set tenant_id = a.tenant_id
  from atas a
  where ai.ata_id = a.id and ai.tenant_id is null and a.tenant_id is not null;

update cot_fornecedores cf
  set tenant_id = c.tenant_id
  from cotacoes c
  where cf.cotacao_id = c.id and cf.tenant_id is null and c.tenant_id is not null;

update cot_itens ci
  set tenant_id = c.tenant_id
  from cotacoes c
  where ci.cotacao_id = c.id and ci.tenant_id is null and c.tenant_id is not null;

update cot_valores cv
  set tenant_id = ci.tenant_id
  from cot_itens ci
  where cv.item_id = ci.id and cv.tenant_id is null and ci.tenant_id is not null;

update cot_fontes_ia cfi
  set tenant_id = c.tenant_id
  from cotacoes c
  where cfi.cotacao_id = c.id and cfi.tenant_id is null and c.tenant_id is not null;

update lexcore_pontos_criticos lpc
  set tenant_id = la.tenant_id
  from lexcore_analises la
  where lpc.analise_id = la.id and lpc.tenant_id is null and la.tenant_id is not null;

update lexcore_pecas lp
  set tenant_id = la.tenant_id
  from lexcore_analises la
  where lp.analise_id = la.id and lp.tenant_id is null and la.tenant_id is not null;

update dispensa_logs dl
  set tenant_id = dp.tenant_id
  from dispensa_processos dp
  where dl.processo_id = dp.id and dl.tenant_id is null and dp.tenant_id is not null;

-- ── 6. Trigger: preenche tenant_id sozinho em todo INSERT autenticado ────
create or replace function set_tenant_id_from_auth()
returns trigger language plpgsql as $$
begin
  if new.tenant_id is null then
    new.tenant_id := current_tenant_id();
  end if;
  return new;
end;
$$;

do $$
declare
  tbl text;
  tabelas_com_trigger text[] := array[
    'processos','atas','ata_itens','contratos','dispensas','inexigibilidades',
    'cotacoes','cot_fornecedores','cot_itens','cot_valores','cot_fontes_ia',
    'dispensa_config','dispensa_processos','dispensa_logs',
    'lexcore_analises','lexcore_pontos_criticos','lexcore_pecas','lexcore_respostas',
    'checklist_habilitacao','orgaos'
  ];
begin
  foreach tbl in array tabelas_com_trigger loop
    execute format('drop trigger if exists trg_set_tenant_id on %I', tbl);
    execute format(
      'create trigger trg_set_tenant_id before insert on %I for each row execute function set_tenant_id_from_auth()',
      tbl
    );
  end loop;
end $$;

-- ── 7. RLS: isolamento real por tenant (substitui allow_auth) ───────────
-- Mesma expressão em using/with check: enxerga e escreve só no próprio
-- tenant; super_admin passa por tudo (using) e pode escrever em qualquer
-- tenant (with check) — necessário para o onboarding/impersonação futura.
do $$
declare
  tbl text;
  tabelas_isoladas text[] := array[
    'processos','atas','ata_itens','contratos','dispensas','inexigibilidades',
    'cotacoes','cot_fornecedores','cot_itens','cot_valores','cot_fontes_ia',
    'dispensa_config','dispensa_processos','dispensa_logs',
    'lexcore_analises','lexcore_pontos_criticos','lexcore_pecas','lexcore_respostas'
  ];
begin
  foreach tbl in array tabelas_isoladas loop
    execute format('alter table %I enable row level security', tbl);
    execute format('drop policy if exists allow_auth on %I', tbl);
    execute format(
      'create policy tenant_isolation on %I for all to authenticated
         using (tenant_id = current_tenant_id() or is_super_admin())
         with check (tenant_id = current_tenant_id() or is_super_admin())',
      tbl
    );
  end loop;
end $$;

-- checklist_habilitacao usava 4 policies nomeadas por operação (não "allow_auth") — troca pelo mesmo padrão.
alter table checklist_habilitacao enable row level security;
drop policy if exists "Authenticated users can select checklist_habilitacao" on checklist_habilitacao;
drop policy if exists "Authenticated users can insert checklist_habilitacao" on checklist_habilitacao;
drop policy if exists "Authenticated users can update checklist_habilitacao" on checklist_habilitacao;
drop policy if exists "Authenticated users can delete checklist_habilitacao" on checklist_habilitacao;
drop policy if exists tenant_isolation on checklist_habilitacao;
create policy tenant_isolation on checklist_habilitacao for all to authenticated
  using (tenant_id = current_tenant_id() or is_super_admin())
  with check (tenant_id = current_tenant_id() or is_super_admin());

-- orgaos: hoje tem RLS DESABILITADO de propósito para leitura pública do Portal.
-- Reativamos RLS para isolar CRUD por tenant, mas preservamos a leitura pública
-- (anon) recriando explicitamente a policy que o GRANT sozinho não cobre mais
-- com RLS ligado.
alter table orgaos enable row level security;
drop policy if exists tenant_isolation on orgaos;
create policy tenant_isolation on orgaos for all to authenticated
  using (tenant_id = current_tenant_id() or is_super_admin())
  with check (tenant_id = current_tenant_id() or is_super_admin());
drop policy if exists "portal anon orgaos" on orgaos;
create policy "portal anon orgaos" on orgaos for select to anon using (true);

-- ── 8. NOT NULL só onde o backfill realmente cobriu 100% das linhas ─────
do $$
declare
  tbl text;
  null_count int;
  todas_as_tabelas text[] := array[
    'processos','atas','ata_itens','contratos','dispensas','inexigibilidades',
    'cotacoes','cot_fornecedores','cot_itens','cot_valores','cot_fontes_ia',
    'dispensa_config','dispensa_processos','dispensa_logs',
    'lexcore_analises','lexcore_pontos_criticos','lexcore_pecas','lexcore_respostas',
    'checklist_habilitacao','orgaos'
  ];
begin
  foreach tbl in array todas_as_tabelas loop
    execute format('select count(*) from %I where tenant_id is null', tbl) into null_count;
    if null_count = 0 then
      execute format('alter table %I alter column tenant_id set not null', tbl);
    else
      raise notice 'Tabela % ainda tem % linha(s) com tenant_id NULL — NOT NULL não aplicado. Depois de corrigir, rode: ALTER TABLE % ALTER COLUMN tenant_id SET NOT NULL;', tbl, null_count, tbl;
    end if;
  end loop;
end $$;

-- ── 9. Recarregar schema PostgREST ───────────────────────────────────────
notify pgrst, 'reload schema';
