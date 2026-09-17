// Escopo de tenant em memoria (so usado pelo super_admin via "Acessar como"/
// "Minha Area" — RLS ja isola sozinha um usuario cliente normal, entao nesse
// caso o escopo fica null e nada muda). Setado por App.jsx sempre que o
// super_admin troca de tenant impersonado; lido por todos os modulos de
// acesso a dados (db.js, lexcoreDb.js, dbDispensas.js, dbPlanejamento.js,
// carimboDb.js etc.) para que escritas/leituras apontem para o tenant certo
// em vez de confiar so no trigger set_tenant_id_from_auth() (que resolve pelo
// usuario REALMENTE autenticado, nao pelo tenant impersonado).
let scopedTenantId = null;

export function setTenantScope(tenantId) { scopedTenantId = tenantId || null; }
export function getTenantScope() { return scopedTenantId; }
export const withTenantScope = query => scopedTenantId ? query.eq('tenant_id', scopedTenantId) : query;
