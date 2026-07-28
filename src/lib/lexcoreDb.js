import { getSupabase } from './supabase.js';

function analiseFromDb(row) {
  return {
    id: row.id,
    nomeEdital: row.nome_edital || '',
    numeroProcesso: row.numero_processo || '',
    arquivoOriginalUrl: row.arquivo_original_url || '',
    textoExtraido: row.texto_extraido || '',
    status: row.status || 'processando',
    mensagemErro: row.mensagem_erro || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function pontoFromDb(row) {
  return {
    id: row.id,
    analiseId: row.analise_id,
    trechoEdital: row.trecho_edital || '',
    tipoProblema: row.tipo_problema,
    descricaoProblema: row.descricao_problema || '',
    fundamentacaoLegal: row.fundamentacao_legal || '',
    artigoLei: row.artigo_lei || '',
    nivelRisco: row.nivel_risco,
    selecionado: !!row.selecionado,
  };
}

function pecaFromDb(row) {
  return {
    id: row.id,
    analiseId: row.analise_id,
    tipoPeca: row.tipo_peca,
    pontosCriticosIds: row.pontos_criticos_ids || [],
    conteudoGerado: row.conteudo_gerado || '',
    status: row.status || 'rascunho',
    versao: row.versao || 1,
    arquivoDocxUrl: row.arquivo_docx_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Análises ───────────────────────────────────────────────────
export async function sbListLexcoreAnalises() {
  const sb = getSupabase();
  const { data, error } = await sb.from('lexcore_analises').select('*').order('created_at', { ascending: false });
  if (error) return { data: [], error };
  return { data: data.map(analiseFromDb), error: null };
}

export async function sbCreateLexcoreAnalise({ nomeEdital, numeroProcesso, arquivoOriginalUrl }) {
  const sb = getSupabase();
  const { data: userData } = await sb.auth.getUser();
  const { data, error } = await sb.from('lexcore_analises').insert({
    nome_edital: nomeEdital,
    numero_processo: numeroProcesso || null,
    arquivo_original_url: arquivoOriginalUrl || null,
    status: 'processando',
    criado_por: userData?.user?.id || null,
  }).select().single();
  return { data: data ? analiseFromDb(data) : null, error };
}

export async function sbUpdateLexcoreAnalise(id, patch) {
  const sb = getSupabase();
  const payload = { updated_at: new Date().toISOString() };
  if ('status' in patch) payload.status = patch.status;
  if ('mensagemErro' in patch) payload.mensagem_erro = patch.mensagemErro;
  if ('textoExtraido' in patch) payload.texto_extraido = patch.textoExtraido;
  const { data, error } = await sb.from('lexcore_analises').update(payload).eq('id', id).select().single();
  return { data: data ? analiseFromDb(data) : null, error };
}

export async function sbDeleteLexcoreAnalise(id) {
  const sb = getSupabase();
  return sb.from('lexcore_analises').delete().eq('id', id);
}

export async function sbGetLexcoreAnalise(id) {
  const sb = getSupabase();
  const { data, error } = await sb.from('lexcore_analises').select('*').eq('id', id).single();
  if (error) return { data: null, error };
  return { data: analiseFromDb(data), error: null };
}

// ── Pontos críticos ────────────────────────────────────────────
export async function sbListPontosCriticos(analiseId) {
  const sb = getSupabase();
  const { data, error } = await sb.from('lexcore_pontos_criticos').select('*').eq('analise_id', analiseId).order('created_at', { ascending: true });
  if (error) return { data: [], error };
  return { data: data.map(pontoFromDb), error: null };
}

export async function sbInsertPontosCriticos(analiseId, pontos) {
  const sb = getSupabase();
  if (!pontos.length) return { data: [], error: null };
  const payload = pontos.map(p => ({
    analise_id: analiseId,
    trecho_edital: p.trecho_edital,
    tipo_problema: p.tipo_problema,
    descricao_problema: p.descricao_problema,
    fundamentacao_legal: p.fundamentacao_legal,
    artigo_lei: p.artigo_lei,
    nivel_risco: p.nivel_risco,
  }));
  const { data, error } = await sb.from('lexcore_pontos_criticos').insert(payload).select();
  return { data: data ? data.map(pontoFromDb) : [], error };
}

export async function sbSetPontoSelecionado(id, selecionado) {
  const sb = getSupabase();
  return sb.from('lexcore_pontos_criticos').update({ selecionado }).eq('id', id);
}

// ── Peças ──────────────────────────────────────────────────────
export async function sbListPecas(analiseId) {
  const sb = getSupabase();
  const { data, error } = await sb.from('lexcore_pecas').select('*').eq('analise_id', analiseId).order('created_at', { ascending: false });
  if (error) return { data: [], error };
  return { data: data.map(pecaFromDb), error: null };
}

// Lista TODAS as peças (de todas as análises), com nome/número do edital
// de origem embutidos via join — usada pela lista unificada do card
// "LexCore Peças Jurídicas", que não é mais escopada por análise.
export async function sbListTodasPecas() {
  const sb = getSupabase();
  const { data, error } = await sb.from('lexcore_pecas')
    .select('*, lexcore_analises(nome_edital, numero_processo)')
    .order('created_at', { ascending: false });
  if (error) return { data: [], error };
  return {
    data: data.map(row => ({
      ...pecaFromDb(row),
      nomeEdital: row.lexcore_analises?.nome_edital || '',
      numeroProcesso: row.lexcore_analises?.numero_processo || '',
    })),
    error: null,
  };
}

export async function sbGetPeca(id) {
  const sb = getSupabase();
  const { data, error } = await sb.from('lexcore_pecas').select('*').eq('id', id).single();
  if (error) return { data: null, error };
  return { data: pecaFromDb(data), error: null };
}

export async function sbCreatePeca({ analiseId, tipoPeca, pontosCriticosIds, conteudoGerado }) {
  const sb = getSupabase();
  const { data, error } = await sb.from('lexcore_pecas').insert({
    analise_id: analiseId,
    tipo_peca: tipoPeca,
    pontos_criticos_ids: pontosCriticosIds,
    conteudo_gerado: conteudoGerado,
    status: 'rascunho',
  }).select().single();
  return { data: data ? pecaFromDb(data) : null, error };
}

export async function sbUpdatePeca(id, patch) {
  const sb = getSupabase();
  const payload = { updated_at: new Date().toISOString() };
  if ('conteudoGerado' in patch) payload.conteudo_gerado = patch.conteudoGerado;
  if ('status' in patch) payload.status = patch.status;
  if ('arquivoDocxUrl' in patch) payload.arquivo_docx_url = patch.arquivoDocxUrl;
  if ('versao' in patch) payload.versao = patch.versao;
  const { data, error } = await sb.from('lexcore_pecas').update(payload).eq('id', id).select().single();
  return { data: data ? pecaFromDb(data) : null, error };
}

export async function sbDeletePeca(id) {
  const sb = getSupabase();
  return sb.from('lexcore_pecas').delete().eq('id', id);
}

// ── Upload do edital original ────────────────────────────────────
// Feito via endpoint serverless (service role, ignora RLS) — o mesmo padrão
// já usado por dispensas-docs (api/dispensa-gerar.js). Upload direto do
// navegador com a chave anon/authenticated não tem policy de INSERT no
// bucket (só leitura pública), então sempre falha com RLS violation.
export async function uploadEditalOriginal(file) {
  try {
    const fileBase64 = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = e => resolve(e.target.result.split(',')[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const resp = await fetch('/api/lexcore-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, fileType: file.type, fileBase64 }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return { url: null, error: new Error(json.error || 'Erro ao enviar o edital') };
    return { url: json.url, error: null };
  } catch (error) {
    return { url: null, error };
  }
}

// ── Chama a API serverless que gera o .docx e faz upload ────────
export async function exportarPecaDocx({ pecaId, tipoPeca, conteudoGerado, nomeEdital, numeroProcesso }) {
  const resp = await fetch('/api/lexcore-exportar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pecaId, tipoPeca, conteudoGerado, nomeEdital, numeroProcesso }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(json.error || 'Erro ao exportar peça');
    err.payload = json;
    throw err;
  }
  return json;
}
