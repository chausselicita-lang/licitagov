-- ============================================================
-- LicitaGov — Pesquisa de Preços por Item via MCP (PNCP + Painel de Preços)
-- Projeto: xqlrfsrjvqmucchzpapk
--
-- Estende cot_fontes_ia para granularidade por item + fonte oficial
-- estruturada (PNCP/Painel de Preços, além do web_search já existente),
-- e cotacoes para guardar a URL do mapa comparativo exportado em .docx.
--
-- Não recria RLS: cot_fontes_ia e cotacoes já estão em `tabelas_isoladas`
-- (policy tenant_isolation) e `tabelas_com_trigger` (trg_set_tenant_id)
-- em migration_multitenancy.sql — colunas novas herdam tudo automaticamente.
-- cot_fontes_ia também já tem a policy anon "portal publico cot_fontes_ia"
-- de migration_portal_cotacoes.sql, que cobre as colunas novas do mesmo jeito.
-- ============================================================

alter table cot_fontes_ia add column if not exists item_id          uuid references cot_itens(id) on delete cascade;
alter table cot_fontes_ia add column if not exists fonte            text not null default 'web_search';
alter table cot_fontes_ia add column if not exists unidade_medida   text;
alter table cot_fontes_ia add column if not exists orgao_referencia text;
alter table cot_fontes_ia add column if not exists data_referencia  date;
alter table cot_fontes_ia add column if not exists selecionado      boolean not null default true;

create index if not exists idx_cot_fontes_ia_item on cot_fontes_ia(item_id);

alter table cotacoes add column if not exists mapa_docx_url text;

-- Recarregar schema PostgREST
select pg_notify('pgrst', 'reload schema');
