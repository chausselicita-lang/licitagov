import { getSupabase } from './supabase.js';

function respostaFromDb(row) {
  return {
    id: row.id,
    tipoResposta: row.tipo_resposta,
    nomeReferencia: row.nome_referencia || '',
    numeroProcesso: row.numero_processo || '',
    arquivoOrigemUrl: row.arquivo_origem_url || '',
    conteudoGerado: row.conteudo_gerado || '',
    status: row.status || 'rascunho',
    versao: row.versao || 1,
    arquivoDocxUrl: row.arquivo_docx_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Respostas ──────────────────────────────────────────────────
export async function sbListRespostas() {
  const sb = getSupabase();
  const { data, error } = await sb.from('lexcore_respostas').select('*').order('created_at', { ascending: false });
  if (error) return { data: [], error };
  return { data: data.map(respostaFromDb), error: null };
}

export async function sbCreateResposta({ tipoResposta, nomeReferencia, numeroProcesso, arquivoOrigemUrl, conteudoGerado }) {
  const sb = getSupabase();
  const { data: userData } = await sb.auth.getUser();
  const { data, error } = await sb.from('lexcore_respostas').insert({
    tipo_resposta: tipoResposta,
    nome_referencia: nomeReferencia || null,
    numero_processo: numeroProcesso || null,
    arquivo_origem_url: arquivoOrigemUrl || null,
    conteudo_gerado: conteudoGerado,
    status: 'rascunho',
    criado_por: userData?.user?.id || null,
  }).select().single();
  return { data: data ? respostaFromDb(data) : null, error };
}

export async function sbGetResposta(id) {
  const sb = getSupabase();
  const { data, error } = await sb.from('lexcore_respostas').select('*').eq('id', id).single();
  if (error) return { data: null, error };
  return { data: respostaFromDb(data), error: null };
}

export async function sbUpdateResposta(id, patch) {
  const sb = getSupabase();
  const payload = { updated_at: new Date().toISOString() };
  if ('conteudoGerado' in patch) payload.conteudo_gerado = patch.conteudoGerado;
  if ('status' in patch) payload.status = patch.status;
  if ('arquivoDocxUrl' in patch) payload.arquivo_docx_url = patch.arquivoDocxUrl;
  if ('versao' in patch) payload.versao = patch.versao;
  const { data, error } = await sb.from('lexcore_respostas').update(payload).eq('id', id).select().single();
  return { data: data ? respostaFromDb(data) : null, error };
}

export async function sbDeleteResposta(id) {
  const sb = getSupabase();
  return sb.from('lexcore_respostas').delete().eq('id', id);
}

// ── Upload do documento recebido (impugnação/recurso) ────────────
// Reaproveita o endpoint /api/lexcore-upload já existente (genérico: recebe
// fileName/fileType/fileBase64 e devolve a URL pública no bucket
// lexcore-docs) — endpoint não é alterado por este arquivo.
export async function uploadDocumentoRecebido(file) {
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
    if (!resp.ok) return { url: null, error: new Error(json.error || 'Erro ao enviar o documento') };
    return { url: json.url, error: null };
  } catch (error) {
    return { url: null, error };
  }
}

// ── Chama a API serverless que gera o .docx e faz upload ────────
export async function exportarRespostaDocx({ respostaId, tipoResposta, conteudoGerado, nomeReferencia, numeroProcesso }) {
  const resp = await fetch('/api/lexcore-resposta-exportar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ respostaId, tipoResposta, conteudoGerado, nomeReferencia, numeroProcesso }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(json.error || 'Erro ao exportar resposta');
    err.payload = json;
    throw err;
  }
  return { resposta: json.resposta ? respostaFromDb(json.resposta) : null, docxUrl: json.docxUrl };
}
