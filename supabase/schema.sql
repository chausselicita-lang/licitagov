-- LicitaGov — Schema Supabase
-- Projeto: zigghtvlmftgjlohuhla
-- Execute no SQL Editor do Supabase Dashboard
-- Após executar: SELECT pg_notify('pgrst', 'reload schema');

-- ── Processos Licitatórios ───────────────────────────────────
create table if not exists processos (
  id            uuid primary key default gen_random_uuid(),
  numero        text not null,
  objeto        text not null,
  modalidade    text default 'Pregão Eletrônico',
  fase          text default 'Planejamento',
  valor         numeric(15,2) default 0,
  abertura      date,
  orgao         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
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
  created_at  timestamptz default now()
);

-- ── Cotações / Pesquisa de Preços ────────────────────────────
create table if not exists cotacoes (
  id            uuid primary key default gen_random_uuid(),
  numero        text not null,
  objeto        text not null,
  processo      text,
  status        text default 'Em coleta',
  data_criacao  date default current_date,
  created_at    timestamptz default now()
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

-- ── Row Level Security (acesso público demo) ─────────────────
alter table processos       enable row level security;
alter table atas            enable row level security;
alter table ata_itens       enable row level security;
alter table contratos       enable row level security;
alter table cotacoes        enable row level security;
alter table cot_fornecedores enable row level security;
alter table cot_itens       enable row level security;
alter table cot_valores     enable row level security;

do $$ begin
  if not exists (select from pg_policies where tablename='processos' and policyname='allow_all') then
    create policy allow_all on processos       for all using (true) with check (true);
    create policy allow_all on atas            for all using (true) with check (true);
    create policy allow_all on ata_itens       for all using (true) with check (true);
    create policy allow_all on contratos       for all using (true) with check (true);
    create policy allow_all on cotacoes        for all using (true) with check (true);
    create policy allow_all on cot_fornecedores for all using (true) with check (true);
    create policy allow_all on cot_itens       for all using (true) with check (true);
    create policy allow_all on cot_valores     for all using (true) with check (true);
  end if;
end $$;

-- Recarregar schema PostgREST
select pg_notify('pgrst', 'reload schema');
