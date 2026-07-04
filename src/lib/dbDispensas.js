import { getSupabase } from './supabase.js';

function processoFromDb(row) {
  return {
    id: row.id,
    numeroProcesso: row.numero_processo || '',
    numeroDispensa: row.numero_dispensa || '',
    objeto: row.objeto || '',
    tipoObjeto: row.tipo_objeto || 'compras_servicos',
    valorEstimado: parseFloat(row.valor_estimado) || 0,
    prazoExecucao: row.prazo_execucao || '',
    unidadeGestora: row.unidade_gestora || '',
    status: row.status || 'Rascunho',
    limiteLegal: row.limite_legal ? parseFloat(row.limite_legal) : null,
    excedeLimite: !!row.excede_limite,
    fundamentacaoLegal: row.fundamentacao_legal || '',
    dadosComplementares: row.dados_complementares || {},
    docxUrl: row.docx_url || '',
    pdfUrl: row.pdf_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function sbListDispensaProcessos() {
  const sb = getSupabase();
  const { data, error } = await sb.from('dispensa_processos').select('*').order('created_at', { ascending: false });
  if (error) return { data: [], error };
  return { data: data.map(processoFromDb), error: null };
}

export async function sbSaveRascunho(input) {
  const sb = getSupabase();
  const payload = {
    numero_processo: input.numeroProcesso || null,
    numero_dispensa: input.numeroDispensa || null,
    objeto: input.objeto,
    tipo_objeto: input.tipoObjeto || 'compras_servicos',
    valor_estimado: input.valorEstimado || 0,
    prazo_execucao: input.prazoExecucao || null,
    unidade_gestora: input.unidadeGestora || null,
    status: 'Rascunho',
    dados_complementares: input.dadosComplementares || {},
  };
  if (input.id) {
    const { data, error } = await sb.from('dispensa_processos').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', input.id).select().single();
    return { data: data ? processoFromDb(data) : null, error };
  }
  const { data, error } = await sb.from('dispensa_processos').insert(payload).select().single();
  return { data: data ? processoFromDb(data) : null, error };
}

export async function sbDeleteDispensaProcesso(id) {
  const sb = getSupabase();
  return sb.from('dispensa_processos').delete().eq('id', id);
}

// ── Configuração institucional (município, prefeito, agente, etc.) ──
function configFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    municipio: row.municipio || '',
    uf: row.uf || '',
    cnpjMunicipio: row.cnpj_municipio || '',
    endereco: row.endereco || '',
    cep: row.cep || '',
    emailLicitacao: row.email_licitacao || '',
    prefeitoNome: row.prefeito_nome || '',
    prefeitoCpf: row.prefeito_cpf || '',
    agenteContratacaoNome: row.agente_contratacao_nome || '',
    agenteContratacaoMatricula: row.agente_contratacao_matricula || '',
    procuradorNome: row.procurador_nome || '',
    procuradorOab: row.procurador_oab || '',
    secretarioFinancasNome: row.secretario_financas_nome || '',
    portariaAgente: row.portaria_agente || '',
    decretoMunicipal: row.decreto_municipal || '',
  };
}

export async function sbGetDispensaConfig() {
  const sb = getSupabase();
  const { data, error } = await sb.from('dispensa_config').select('*').limit(1).maybeSingle();
  if (error) return { data: null, error };
  return { data: configFromDb(data), error: null };
}

export async function sbSaveDispensaConfig(cfg) {
  const sb = getSupabase();
  const payload = {
    municipio: cfg.municipio || '',
    uf: cfg.uf || '',
    cnpj_municipio: cfg.cnpjMunicipio || '',
    endereco: cfg.endereco || '',
    cep: cfg.cep || '',
    email_licitacao: cfg.emailLicitacao || '',
    prefeito_nome: cfg.prefeitoNome || '',
    prefeito_cpf: cfg.prefeitoCpf || '',
    agente_contratacao_nome: cfg.agenteContratacaoNome || '',
    agente_contratacao_matricula: cfg.agenteContratacaoMatricula || '',
    procurador_nome: cfg.procuradorNome || '',
    procurador_oab: cfg.procuradorOab || '',
    secretario_financas_nome: cfg.secretarioFinancasNome || '',
    portaria_agente: cfg.portariaAgente || '',
    decreto_municipal: cfg.decretoMunicipal || '',
    updated_at: new Date().toISOString(),
  };
  if (cfg.id) {
    const { data, error } = await sb.from('dispensa_config').update(payload).eq('id', cfg.id).select().single();
    return { data: configFromDb(data), error };
  }
  const { data, error } = await sb.from('dispensa_config').insert(payload).select().single();
  return { data: configFromDb(data), error };
}

// ── Chama a API serverless que valida, gera docx/pdf e faz upload ──
export async function gerarProcessoDispensa({ processoId, input, config }) {
  const resp = await fetch('/api/dispensa-gerar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ processoId, input, config }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(json.mensagem || json.error || 'Erro ao gerar processo');
    err.payload = json;
    throw err;
  }
  return json;
}
