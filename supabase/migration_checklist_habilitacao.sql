-- Tabela: checklist_habilitacao
-- Módulo de análise de habilitação em licitações (Lei 14.133/2021)

create table if not exists public.checklist_habilitacao (
  id              uuid primary key default gen_random_uuid(),
  numero_processo text not null,
  objeto          text,
  empresa_nome    text not null,
  empresa_cnpj    text,
  checklist       jsonb,
  veredicto       text check (veredicto in ('HABILITADA','INABILITADA','PENDENTE')),
  parecer_ia      text,
  pdfs_nomes      text[],
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Índices
create index if not exists idx_checklist_processo on public.checklist_habilitacao (numero_processo);
create index if not exists idx_checklist_empresa  on public.checklist_habilitacao (empresa_cnpj);

-- RLS
alter table public.checklist_habilitacao enable row level security;

create policy "Authenticated users can select checklist_habilitacao"
  on public.checklist_habilitacao for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert checklist_habilitacao"
  on public.checklist_habilitacao for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update checklist_habilitacao"
  on public.checklist_habilitacao for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete checklist_habilitacao"
  on public.checklist_habilitacao for delete
  using (auth.role() = 'authenticated');

-- Trigger para updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_checklist_habilitacao_updated_at on public.checklist_habilitacao;
create trigger trg_checklist_habilitacao_updated_at
  before update on public.checklist_habilitacao
  for each row execute function public.set_updated_at();
