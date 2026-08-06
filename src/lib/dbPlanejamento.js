import { getSupabase } from './supabase.js';

function processoFromDb(row) {
  return {
    id: row.id,
    numeroProcesso: row.numero_processo || '',
    objeto: row.objeto || '',
    justificativaResumida: row.justificativa_resumida || '',
    quantidadeEstimada: row.quantidade_estimada,
    valorEstimado: row.valor_estimado != null ? parseFloat(row.valor_estimado) : null,
    areaRequisitante: row.area_requisitante || '',
    tipoContratacao: row.tipo_contratacao,
    status: row.status || 'intake',
    criadoPor: row.criado_por,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dfdFromDb(row) {
  return {
    id: row.id,
    processoId: row.processo_id,
    conteudoGerado: row.conteudo_gerado || '',
    status: row.status || 'rascunho',
    versao: row.versao || 1,
    arquivoDocxUrl: row.arquivo_docx_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function etpFromDb(row) {
  return {
    id: row.id,
    processoId: row.processo_id,
    perguntasComplementares: row.perguntas_complementares || [],
    conteudoGerado: row.conteudo_gerado || '',
    status: row.status || 'rascunho',
    versao: row.versao || 1,
    arquivoDocxUrl: row.arquivo_docx_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function trFromDb(row) {
  return {
    id: row.id,
    processoId: row.processo_id,
    conteudoGerado: row.conteudo_gerado || '',
    status: row.status || 'rascunho',
    versao: row.versao || 1,
    arquivoDocxUrl: row.arquivo_docx_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapaRiscosFromDb(row) {
  return {
    id: row.id,
    processoId: row.processo_id,
    riscos: row.riscos || [],
    conteudoGerado: row.conteudo_gerado || '',
    status: row.status || 'rascunho',
    versao: row.versao || 1,
    arquivoDocxUrl: row.arquivo_docx_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Processo (intake) ────────────────────────────────────────────
export async function sbCreateProcessoPlanejamento(input) {
  const sb = getSupabase();
  const { data: userData } = await sb.auth.getUser();
  const { data, error } = await sb.from('planejamento_processos').insert({
    numero_processo: input.numeroProcesso || null,
    objeto: input.objeto,
    justificativa_resumida: input.justificativaResumida,
    quantidade_estimada: input.quantidadeEstimada ?? null,
    valor_estimado: input.valorEstimado ?? null,
    area_requisitante: input.areaRequisitante,
    tipo_contratacao: input.tipoContratacao,
    criado_por: userData?.user?.id || null,
  }).select().single();
  return { data: data ? processoFromDb(data) : null, error };
}

export async function sbGetProcessoPlanejamento(id) {
  const sb = getSupabase();
  const { data, error } = await sb.from('planejamento_processos').select('*').eq('id', id).single();
  if (error) return { data: null, error };
  return { data: processoFromDb(data), error: null };
}

export async function sbListProcessosPlanejamento() {
  const sb = getSupabase();
  const { data, error } = await sb.from('planejamento_processos').select('*').order('created_at', { ascending: false });
  if (error) return { data: [], error };
  return { data: data.map(processoFromDb), error: null };
}

export async function sbUpdateStatusProcessoPlanejamento(id, status) {
  const sb = getSupabase();
  const { data, error } = await sb.from('planejamento_processos')
    .update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  return { data: data ? processoFromDb(data) : null, error };
}

// ── DFD ───────────────────────────────────────────────────────────
export async function sbGetDfd(processoId) {
  const sb = getSupabase();
  const { data, error } = await sb.from('planejamento_dfd').select('*').eq('processo_id', processoId).maybeSingle();
  if (error) return { data: null, error };
  return { data: data ? dfdFromDb(data) : null, error: null };
}

export async function sbCreateDfd({ processoId, conteudoGerado }) {
  const sb = getSupabase();
  const { data, error } = await sb.from('planejamento_dfd').insert({
    processo_id: processoId,
    conteudo_gerado: conteudoGerado,
  }).select().single();
  return { data: data ? dfdFromDb(data) : null, error };
}

export async function sbUpdateDfd(id, patch) {
  const sb = getSupabase();
  const payload = { updated_at: new Date().toISOString() };
  if ('conteudoGerado' in patch) payload.conteudo_gerado = patch.conteudoGerado;
  if ('status' in patch) payload.status = patch.status;
  if ('arquivoDocxUrl' in patch) payload.arquivo_docx_url = patch.arquivoDocxUrl;
  if ('versao' in patch) payload.versao = patch.versao;
  const { data, error } = await sb.from('planejamento_dfd').update(payload).eq('id', id).select().single();
  return { data: data ? dfdFromDb(data) : null, error };
}

// ── ETP ───────────────────────────────────────────────────────────
export async function sbGetEtp(processoId) {
  const sb = getSupabase();
  const { data, error } = await sb.from('planejamento_etp').select('*').eq('processo_id', processoId).maybeSingle();
  if (error) return { data: null, error };
  return { data: data ? etpFromDb(data) : null, error: null };
}

export async function sbCreateEtp({ processoId, perguntasComplementares, conteudoGerado }) {
  const sb = getSupabase();
  const { data, error } = await sb.from('planejamento_etp').insert({
    processo_id: processoId,
    perguntas_complementares: perguntasComplementares || [],
    conteudo_gerado: conteudoGerado,
  }).select().single();
  return { data: data ? etpFromDb(data) : null, error };
}

export async function sbUpdateEtp(id, patch) {
  const sb = getSupabase();
  const payload = { updated_at: new Date().toISOString() };
  if ('conteudoGerado' in patch) payload.conteudo_gerado = patch.conteudoGerado;
  if ('status' in patch) payload.status = patch.status;
  if ('arquivoDocxUrl' in patch) payload.arquivo_docx_url = patch.arquivoDocxUrl;
  if ('versao' in patch) payload.versao = patch.versao;
  const { data, error } = await sb.from('planejamento_etp').update(payload).eq('id', id).select().single();
  return { data: data ? etpFromDb(data) : null, error };
}

// ── TR ────────────────────────────────────────────────────────────
export async function sbGetTr(processoId) {
  const sb = getSupabase();
  const { data, error } = await sb.from('planejamento_tr').select('*').eq('processo_id', processoId).maybeSingle();
  if (error) return { data: null, error };
  return { data: data ? trFromDb(data) : null, error: null };
}

export async function sbCreateTr({ processoId, conteudoGerado }) {
  const sb = getSupabase();
  const { data, error } = await sb.from('planejamento_tr').insert({
    processo_id: processoId,
    conteudo_gerado: conteudoGerado,
  }).select().single();
  return { data: data ? trFromDb(data) : null, error };
}

export async function sbUpdateTr(id, patch) {
  const sb = getSupabase();
  const payload = { updated_at: new Date().toISOString() };
  if ('conteudoGerado' in patch) payload.conteudo_gerado = patch.conteudoGerado;
  if ('status' in patch) payload.status = patch.status;
  if ('arquivoDocxUrl' in patch) payload.arquivo_docx_url = patch.arquivoDocxUrl;
  if ('versao' in patch) payload.versao = patch.versao;
  const { data, error } = await sb.from('planejamento_tr').update(payload).eq('id', id).select().single();
  return { data: data ? trFromDb(data) : null, error };
}

// ── Mapa de Riscos ────────────────────────────────────────────────
export async function sbGetMapaRiscos(processoId) {
  const sb = getSupabase();
  const { data, error } = await sb.from('planejamento_mapa_riscos').select('*').eq('processo_id', processoId).maybeSingle();
  if (error) return { data: null, error };
  return { data: data ? mapaRiscosFromDb(data) : null, error: null };
}

export async function sbCreateMapaRiscos({ processoId, riscos, conteudoGerado }) {
  const sb = getSupabase();
  const { data, error } = await sb.from('planejamento_mapa_riscos').insert({
    processo_id: processoId,
    riscos: riscos || [],
    conteudo_gerado: conteudoGerado,
  }).select().single();
  return { data: data ? mapaRiscosFromDb(data) : null, error };
}

export async function sbUpdateMapaRiscos(id, patch) {
  const sb = getSupabase();
  const payload = { updated_at: new Date().toISOString() };
  if ('riscos' in patch) payload.riscos = patch.riscos;
  if ('conteudoGerado' in patch) payload.conteudo_gerado = patch.conteudoGerado;
  if ('status' in patch) payload.status = patch.status;
  if ('arquivoDocxUrl' in patch) payload.arquivo_docx_url = patch.arquivoDocxUrl;
  if ('versao' in patch) payload.versao = patch.versao;
  const { data, error } = await sb.from('planejamento_mapa_riscos').update(payload).eq('id', id).select().single();
  return { data: data ? mapaRiscosFromDb(data) : null, error };
}

// ── Verificador de Coerência ────────────────────────────────────────
function coerenciaFromDb(row) {
  return {
    id: row.id,
    processoId: row.processo_id,
    contradicoes: row.contradicoes || [],
    statusGeral: row.status_geral,
    executadoPor: row.executado_por,
    createdAt: row.created_at,
  };
}

export async function sbListCoerenciaChecks(processoId) {
  const sb = getSupabase();
  const { data, error } = await sb.from('planejamento_coerencia_checks').select('*').eq('processo_id', processoId).order('created_at', { ascending: false });
  if (error) return { data: [], error };
  return { data: data.map(coerenciaFromDb), error: null };
}

export async function sbCreateCoerenciaCheck({ processoId, contradicoes, statusGeral }) {
  const sb = getSupabase();
  const { data: userData } = await sb.auth.getUser();
  const { data, error } = await sb.from('planejamento_coerencia_checks').insert({
    processo_id: processoId,
    contradicoes: contradicoes || [],
    status_geral: statusGeral,
    executado_por: userData?.user?.id || null,
  }).select().single();
  return { data: data ? coerenciaFromDb(data) : null, error };
}

// ── Exportação .docx (mesmo padrão de exportarPecaDocx do LexCore) ──
export async function exportarPecaPlanejamentoDocx({ pecaId, tipoPeca, conteudoGerado, processoObjeto, numeroProcesso }) {
  const resp = await fetch('/api/planejamento-exportar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pecaId, tipoPeca, conteudoGerado, processoObjeto, numeroProcesso }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(json.error || 'Erro ao exportar peça');
    err.payload = json;
    throw err;
  }
  return json;
}
