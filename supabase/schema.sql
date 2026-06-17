-- LicitaGov — Schema Supabase
-- Projeto: xqlrfsrjvqmucchzpapk
-- Execute no SQL Editor: https://supabase.com/dashboard/project/xqlrfsrjvqmucchzpapk/sql/new

-- ── Processos Licitatórios ───────────────────────────────────
create table if not exists processos (
  id          uuid primary key default gen_random_uuid(),
  numero      text not null,
  objeto      text not null,
  modalidade  text default 'Pregão Eletrônico',
  fase        text default 'Planejamento',
  valor       numeric(15,2) default 0,
  abertura    date,
  orgao       text,
  created_at  timestamptz default now()
);

-- ── Atas de Registro de Preços ───────────────────────────────
create table if not exists atas (
  id                uuid primary key default gen_random_uuid(),
  numero            text not null,
  objeto            text not null,
  fornecedor        text,
  cnpj              text,
  vigencia          date,
  valor_total       numeric(15,2) default 0,
  saldo_disponivel  numeric(15,2) default 0,
  link_drive        text,
  endereco          text,
  telefone          text,
  email             text,
  created_at        timestamptz default now()
);

create table if not exists ata_itens (
  id              uuid primary key default gen_random_uuid(),
  ata_id          uuid references atas(id) on delete cascade,
  descricao       text,
  unidade         text,
  qtd_registrada  numeric(12,3) default 0,
  qtd_utilizada   numeric(12,3) default 0,
  valor_unit      numeric(15,4) default 0
);

-- ── Contratos ────────────────────────────────────────────────
create table if not exists contratos (
  id          uuid primary key default gen_random_uuid(),
  numero      text not null,
  objeto      text not null,
  fornecedor  text,
  cnpj        text,
  valor       numeric(15,2) default 0,
  inicio      date,
  fim         date,
  status      text default 'Vigente',
  processo    text,
  link_drive  text,
  created_at  timestamptz default now()
);

-- ── Dispensas de Licitação ───────────────────────────────────
create table if not exists dispensas (
  id                 uuid primary key default gen_random_uuid(),
  numero_processo    text,
  objeto             text not null,
  contratada         text,
  cnpj               text,
  valor_total        numeric(15,2) default 0,
  data_ratificacao   date,
  vigencia           date,
  secretaria         text,
  link_drive         text,
  status             text default 'Em andamento',
  created_at         timestamptz default now()
);

-- ── Inexigibilidades ─────────────────────────────────────────
create table if not exists inexigibilidades (
  id                 uuid primary key default gen_random_uuid(),
  numero_processo    text,
  objeto             text not null,
  contratada         text,
  cnpj               text,
  valor_total        numeric(15,2) default 0,
  data_ratificacao   date,
  vigencia           date,
  secretaria         text,
  link_drive         text,
  status             text default 'Em andamento',
  created_at         timestamptz default now()
);

-- ── Cotações / Pesquisa de Preços ────────────────────────────
create table if not exists cotacoes (
  id                   uuid primary key default gen_random_uuid(),
  numero               text not null,
  objeto               text not null,
  processo             text,
  status               text default 'Em coleta',
  data_criacao         date default current_date,
  gerado_por_ia        boolean default false,
  mediana              numeric(15,4),
  texto_mapa_precos    text,
  created_at           timestamptz default now()
);

create table if not exists cot_fornecedores (
  id          uuid primary key default gen_random_uuid(),
  cotacao_id  uuid references cotacoes(id) on delete cascade,
  razao       text,
  cnpj        text
);

create table if not exists cot_itens (
  id          uuid primary key default gen_random_uuid(),
  cotacao_id  uuid references cotacoes(id) on delete cascade,
  descricao   text,
  unidade     text,
  qtd         numeric(12,3) default 0
);

create table if not exists cot_valores (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid references cot_itens(id) on delete cascade,
  fornecedor_id   uuid references cot_fornecedores(id) on delete cascade,
  valor           numeric(15,4) default 0
);

create table if not exists cot_fontes_ia (
  id              uuid primary key default gen_random_uuid(),
  cotacao_id      uuid references cotacoes(id) on delete cascade,
  descricao       text,
  fornecedor      text,
  valor_unitario  numeric(15,4) default 0,
  url             text
);

-- ── Row Level Security ────────────────────────────────────────
alter table processos         enable row level security;
alter table atas              enable row level security;
alter table ata_itens         enable row level security;
alter table contratos         enable row level security;
alter table dispensas         enable row level security;
alter table inexigibilidades  enable row level security;
alter table cotacoes          enable row level security;
alter table cot_fornecedores  enable row level security;
alter table cot_itens         enable row level security;
alter table cot_valores       enable row level security;
alter table cot_fontes_ia     enable row level security;

-- Políticas: qualquer usuário autenticado pode tudo
create policy allow_auth on processos         for all to authenticated using (true) with check (true);
create policy allow_auth on atas              for all to authenticated using (true) with check (true);
create policy allow_auth on ata_itens         for all to authenticated using (true) with check (true);
create policy allow_auth on contratos         for all to authenticated using (true) with check (true);
create policy allow_auth on dispensas         for all to authenticated using (true) with check (true);
create policy allow_auth on inexigibilidades  for all to authenticated using (true) with check (true);
create policy allow_auth on cotacoes          for all to authenticated using (true) with check (true);
create policy allow_auth on cot_fornecedores  for all to authenticated using (true) with check (true);
create policy allow_auth on cot_itens         for all to authenticated using (true) with check (true);
create policy allow_auth on cot_valores       for all to authenticated using (true) with check (true);
create policy allow_auth on cot_fontes_ia     for all to authenticated using (true) with check (true);

-- Recarregar schema PostgREST
select pg_notify('pgrst', 'reload schema');
