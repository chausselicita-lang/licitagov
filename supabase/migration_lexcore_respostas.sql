-- ============================================================
-- LicitaGov — LexCore: Respostas a Impugnação/Recurso
-- Projeto: xqlrfsrjvqmucchzpapk
--
-- Card independente da análise de edital: o usuário anexa o PDF de uma
-- impugnação ou recurso RECEBIDO e a IA redige a resposta/contrarrazão de
-- defesa em nome do órgão licitante. Sem FK para lexcore_analises —
-- independência real do fluxo de análise (ver
-- docs/superpowers/specs/2026-07-13-lexcore-resposta-impugnacao-design.md).
-- ============================================================

create table if not exists lexcore_respostas (
  id                  uuid primary key default gen_random_uuid(),
  tipo_resposta       text not null
                        check (tipo_resposta in ('resposta_impugnacao', 'contrarrazoes')),
  nome_referencia     text,
  numero_processo     text,
  arquivo_origem_url  text,
  conteudo_gerado     text not null,
  status              text not null default 'rascunho' check (status in ('rascunho', 'finalizada')),
  versao              int not null default 1,
  arquivo_docx_url    text,
  criado_por          uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table lexcore_respostas enable row level security;

drop policy if exists allow_auth on lexcore_respostas;
create policy allow_auth on lexcore_respostas for all to authenticated using (true) with check (true);

-- Reaproveita o bucket "lexcore-docs" já criado em migration_lexcore.sql —
-- não precisa de bucket novo nem de policy nova de storage.

notify pgrst, 'reload schema';
