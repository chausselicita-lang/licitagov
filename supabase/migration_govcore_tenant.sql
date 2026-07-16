-- ============================================================
-- LicitaGov — Cria o tenant "GovCore" e migra os dados do super_admin
-- Projeto: xqlrfsrjvqmucchzpapk
-- Execute no SQL Editor DEPOIS de migration_multitenancy.sql
--
-- Contexto: migration_multitenancy.sql só criava tenants para perfis com
-- role='cliente'. Os processos/atas/contratos etc. que o super_admin já
-- usava no dia a dia (dados reais da própria operação, rótulo "GovCore")
-- ficaram com tenant_id NULL — este script cria um tenant "GovCore" de
-- verdade, aponta o super_admin pra ele e migra todos os dados órfãos
-- (tenant_id NULL) pra esse tenant.
-- ============================================================
do $$
declare
  govcore_id uuid;
  super_id uuid;
begin
  select id into super_id from user_profiles where role = 'super_admin' limit 1;

  select id into govcore_id from tenants where nome = 'GovCore' limit 1;
  if govcore_id is null then
    insert into tenants (nome, ativo) values ('GovCore', true) returning id into govcore_id;
  end if;

  if super_id is not null then
    update user_profiles set tenant_id = govcore_id where id = super_id;
  end if;

  update processos             set tenant_id = govcore_id where tenant_id is null;
  update atas                  set tenant_id = govcore_id where tenant_id is null;
  update ata_itens              set tenant_id = govcore_id where tenant_id is null;
  update contratos              set tenant_id = govcore_id where tenant_id is null;
  update dispensas              set tenant_id = govcore_id where tenant_id is null;
  update inexigibilidades       set tenant_id = govcore_id where tenant_id is null;
  update cotacoes                set tenant_id = govcore_id where tenant_id is null;
  update cot_fornecedores        set tenant_id = govcore_id where tenant_id is null;
  update cot_itens               set tenant_id = govcore_id where tenant_id is null;
  update cot_valores              set tenant_id = govcore_id where tenant_id is null;
  update cot_fontes_ia           set tenant_id = govcore_id where tenant_id is null;
  update dispensa_config         set tenant_id = govcore_id where tenant_id is null;
  update dispensa_processos      set tenant_id = govcore_id where tenant_id is null;
  update dispensa_logs           set tenant_id = govcore_id where tenant_id is null;
  update lexcore_analises        set tenant_id = govcore_id where tenant_id is null;
  update lexcore_pontos_criticos set tenant_id = govcore_id where tenant_id is null;
  update lexcore_pecas           set tenant_id = govcore_id where tenant_id is null;
  update lexcore_respostas       set tenant_id = govcore_id where tenant_id is null;
  update checklist_habilitacao   set tenant_id = govcore_id where tenant_id is null;
  update orgaos                  set tenant_id = govcore_id where tenant_id is null;
end $$;

notify pgrst, 'reload schema';
