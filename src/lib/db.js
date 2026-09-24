import { getSupabase } from './supabase.js';
import { getTenantScope, withTenantScope } from './tenantScope.js';

export { setTenantScope } from './tenantScope.js';

// ── Mappers DB → App ─────────────────────────────────────────────

function ataItemFromDb(row) {
  return {
    id: row.id,
    descricao: row.descricao || '',
    unidade: row.unidade || '',
    qtdRegistrada: parseFloat(row.qtd_registrada) || 0,
    qtdUtilizada: parseFloat(row.qtd_utilizada) || 0,
    valorUnit: parseFloat(row.valor_unit) || 0,
  };
}

function ataFromDb(row) {
  return {
    id: row.id,
    numero: row.numero,
    objeto: row.objeto,
    fornecedor: row.fornecedor || '',
    cnpj: row.cnpj || '',
    vigencia: row.vigencia || '',
    valorTotal: parseFloat(row.valor_total) || 0,
    saldoDisponivel: parseFloat(row.saldo_disponivel) || 0,
    link_drive: row.link_drive || '',
    endereco: row.endereco || '',
    telefone: row.telefone || '',
    email: row.email || '',
    itens: (row.ata_itens || []).map(ataItemFromDb),
  };
}

function fonteIaFromDb(f) {
  return {
    id: f.id,
    fonte: f.fonte || 'web_search',
    descricao: f.descricao || '',
    fornecedor: f.fornecedor || '',
    valor_unitario: parseFloat(f.valor_unitario) || 0,
    unidade_medida: f.unidade_medida || '',
    orgao_referencia: f.orgao_referencia || '',
    data_referencia: f.data_referencia || null,
    url: f.url || '',
    selecionado: f.selecionado !== false,
  };
}

function cotacaoFromDb(row) {
  const fornecedores = (row.cot_fornecedores || []).map(f => ({
    id: f.id,
    razao: f.razao || '',
    cnpj: f.cnpj || '',
  }));
  const todasFontes = row.cot_fontes_ia || [];
  const itens = (row.cot_itens || []).map(it => {
    const valores = {};
    (it.cot_valores || []).forEach(v => {
      valores[v.fornecedor_id] = parseFloat(v.valor) || 0;
    });
    return {
      id: it.id,
      descricao: it.descricao || '',
      unidade: it.unidade || '',
      qtd: String(it.qtd || ''),
      valores,
      // resultados da pesquisa de preço por item via MCP (PNCP/Painel) —
      // fluxo novo, independente das `fontes_ia` de objeto-a-objeto abaixo.
      fontesPesquisa: todasFontes.filter(f => f.item_id === it.id).map(fonteIaFromDb),
    };
  });
  return {
    id: row.id,
    numero: row.numero,
    objeto: row.objeto,
    processo: row.processo || '',
    status: row.status || 'Finalizada',
    dataCriacao: row.data_criacao || '',
    geradoPorIA: row.gerado_por_ia || false,
    mediana: parseFloat(row.mediana) || 0,
    texto_mapa_precos: row.texto_mapa_precos || '',
    mapaDocxUrl: row.mapa_docx_url || '',
    fornecedores,
    itens,
    // fluxo antigo (objeto-a-objeto, web_search) — só as linhas sem item_id.
    fontes_ia: todasFontes.filter(f => !f.item_id).map(fonteIaFromDb),
  };
}

// ── Load all data from Supabase ──────────────────────────────────

export async function loadAllData() {
  const sb = getSupabase();
  const [p, a, c, d, i, cot] = await Promise.all([
    withTenantScope(sb.from('processos').select('*')).order('created_at', { ascending: false }),
    withTenantScope(sb.from('atas').select('*, ata_itens(*)')).order('created_at', { ascending: false }),
    withTenantScope(sb.from('contratos').select('*')).order('created_at', { ascending: false }),
    withTenantScope(sb.from('dispensas').select('*')).order('created_at', { ascending: false }),
    withTenantScope(sb.from('inexigibilidades').select('*')).order('created_at', { ascending: false }),
    withTenantScope(sb.from('cotacoes').select('*, cot_fornecedores(*), cot_itens(*, cot_valores(*)), cot_fontes_ia(*)')).order('created_at', { ascending: false }),
  ]);
  const err = [p.error, a.error, c.error, d.error, i.error, cot.error].find(Boolean);
  if (err) throw err;
  return {
    processos: p.data || [],
    atas: (a.data || []).map(ataFromDb),
    contratos: c.data || [],
    dispensas: d.data || [],
    inexigibilidades: i.data || [],
    cotacoes: (cot.data || []).map(cotacaoFromDb),
  };
}

// ── Processos ────────────────────────────────────────────────────

export const sbCreateProcesso = (row) =>
  getSupabase().from('processos').insert(getTenantScope() ? { ...row, tenant_id: getTenantScope() } : row);

export const sbUpdateProcesso = (id, fields) =>
  getSupabase().from('processos').update(fields).eq('id', id);

export const sbDeleteProcesso = (id) =>
  getSupabase().from('processos').delete().eq('id', id);

// ── Atas ─────────────────────────────────────────────────────────

export const sbCreateAta = (row) =>
  getSupabase().from('atas').insert(getTenantScope() ? { ...row, tenant_id: getTenantScope() } : row);

export const sbUpdateAta = (id, fields) =>
  getSupabase().from('atas').update(fields).eq('id', id);

export const sbDeleteAta = (id) =>
  getSupabase().from('atas').delete().eq('id', id);

export const sbCreateAtaItem = (ataId, item) =>
  getSupabase().from('ata_itens').insert({
    id: item.id,
    ata_id: ataId,
    descricao: item.descricao,
    unidade: item.unidade || null,
    qtd_registrada: item.qtdRegistrada,
    qtd_utilizada: item.qtdUtilizada,
    valor_unit: item.valorUnit,
    ...(getTenantScope() ? { tenant_id: getTenantScope() } : {}),
  });

export const sbDeleteAtaItem = (itemId) =>
  getSupabase().from('ata_itens').delete().eq('id', itemId);

export const sbUpdateAtaSaldo = (ataId, saldoDisponivel) =>
  getSupabase().from('atas').update({ saldo_disponivel: saldoDisponivel }).eq('id', ataId);

// ── Contratos ────────────────────────────────────────────────────

export const sbCreateContrato = (row) =>
  getSupabase().from('contratos').insert(getTenantScope() ? { ...row, tenant_id: getTenantScope() } : row);

export const sbUpdateContrato = (id, fields) =>
  getSupabase().from('contratos').update(fields).eq('id', id);

export const sbDeleteContrato = (id) =>
  getSupabase().from('contratos').delete().eq('id', id);

// ── Dispensas ────────────────────────────────────────────────────

export const sbCreateDispensa = (row) =>
  getSupabase().from('dispensas').insert(getTenantScope() ? { ...row, tenant_id: getTenantScope() } : row);

export const sbUpdateDispensa = (id, fields) =>
  getSupabase().from('dispensas').update(fields).eq('id', id);

export const sbDeleteDispensa = (id) =>
  getSupabase().from('dispensas').delete().eq('id', id);

// ── Inexigibilidades ─────────────────────────────────────────────

export const sbCreateInexigibilidade = (row) =>
  getSupabase().from('inexigibilidades').insert(getTenantScope() ? { ...row, tenant_id: getTenantScope() } : row);

export const sbUpdateInexigibilidade = (id, fields) =>
  getSupabase().from('inexigibilidades').update(fields).eq('id', id);

export const sbDeleteInexigibilidade = (id) =>
  getSupabase().from('inexigibilidades').delete().eq('id', id);

// ── Cotações ─────────────────────────────────────────────────────

export async function sbCreateCotacao(cot) {
  const sb = getSupabase();
  const tid = getTenantScope();
  const withTid = obj => tid ? { ...obj, tenant_id: tid } : obj;

  const { error: e1 } = await sb.from('cotacoes').insert(withTid({
    id: cot.id,
    numero: cot.numero,
    objeto: cot.objeto,
    processo: cot.processo || null,
    status: cot.status || 'Finalizada',
    data_criacao: cot.dataCriacao || null,
    gerado_por_ia: cot.geradoPorIA || false,
    mediana: cot.mediana || null,
    texto_mapa_precos: cot.texto_mapa_precos || null,
  }));
  if (e1) throw e1;

  if (cot.fornecedores?.length) {
    const { error: e2 } = await sb.from('cot_fornecedores').insert(
      cot.fornecedores.map(f => withTid({ id: f.id, cotacao_id: cot.id, razao: f.razao, cnpj: f.cnpj || null }))
    );
    if (e2) throw e2;
  }

  if (cot.itens?.length) {
    const { error: e3 } = await sb.from('cot_itens').insert(
      cot.itens.map(it => withTid({ id: it.id, cotacao_id: cot.id, descricao: it.descricao, unidade: it.unidade || null, qtd: parseFloat(it.qtd) || 0 }))
    );
    if (e3) throw e3;

    const valoresInsert = [];
    cot.itens.forEach(it => {
      if (it.valores) {
        Object.entries(it.valores).forEach(([fornId, valor]) => {
          if (valor > 0) valoresInsert.push(withTid({ item_id: it.id, fornecedor_id: fornId, valor }));
        });
      }
    });
    if (valoresInsert.length) {
      const { error: e4 } = await sb.from('cot_valores').insert(valoresInsert);
      if (e4) throw e4;
    }
  }

  if (cot.fontes_ia?.length) {
    await sb.from('cot_fontes_ia').insert(
      cot.fontes_ia.map(f => withTid({
        cotacao_id: cot.id,
        descricao: f.descricao || null,
        fornecedor: f.fornecedor || null,
        valor_unitario: f.valor_unitario || null,
        url: f.url || null,
      }))
    );
  }
}

export const sbDeleteCotacao = (id) =>
  getSupabase().from('cotacoes').delete().eq('id', id);

// Toggle de seleção de uma fonte de preço (pesquisa por item via MCP) — RLS
// tenant_isolation já garante que só a linha do tenant certo é afetada.
export const sbSelecionarFonteIa = (fonteId, selecionado) =>
  getSupabase().from('cot_fontes_ia').update({ selecionado }).eq('id', fonteId);
