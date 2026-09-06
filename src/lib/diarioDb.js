import { getSupabase } from './supabase.js';

export { CADERNOS, labelCaderno } from './diarioConstants.js';

function edicaoFromDb(row) {
  return {
    id: row.id,
    dataPublicacao: row.data_publicacao,
    status: row.status,
    numero: row.numero,
    anoSerie: row.ano_serie,
    pdfUrl: row.pdf_url || '',
    fechadaEm: row.fechada_em,
    createdAt: row.created_at,
  };
}

function materiaFromDb(row) {
  return {
    id: row.id,
    edicaoId: row.edicao_id,
    caderno: row.caderno,
    orgaoId: row.orgao_id || '',
    titulo: row.titulo,
    corpo: row.corpo,
    ordem: row.ordem || 0,
  };
}

// ── Edições ────────────────────────────────────────────────────
export async function sbListEdicoes() {
  const sb = getSupabase();
  const { data, error } = await sb.from('diario_edicoes').select('*').order('data_publicacao', { ascending: false });
  if (error) return { data: [], error };
  return { data: data.map(edicaoFromDb), error: null };
}

export async function sbGetEdicao(id) {
  const sb = getSupabase();
  const { data, error } = await sb.from('diario_edicoes').select('*').eq('id', id).single();
  if (error) return { data: null, error };
  return { data: edicaoFromDb(data), error: null };
}

export async function sbCreateEdicao(dataPublicacao) {
  const sb = getSupabase();
  const { data, error } = await sb.from('diario_edicoes').insert({ data_publicacao: dataPublicacao }).select().single();
  return { data: data ? edicaoFromDb(data) : null, error };
}

export async function sbDeleteEdicao(id) {
  const sb = getSupabase();
  return sb.from('diario_edicoes').delete().eq('id', id);
}

// Fechamento/numeração/PDF é feito pelo endpoint (service role) — nunca
// direto do browser, mesmo padrão já usado pelo upload do LexCore.
export async function fecharEdicao(edicaoId) {
  const resp = await fetch('/api/diario-fechar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ edicaoId }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error || 'Erro ao fechar edição');
  return json;
}

// ── Matérias ───────────────────────────────────────────────────
export async function sbListMaterias(edicaoId) {
  const sb = getSupabase();
  const { data, error } = await sb.from('diario_materias').select('*').eq('edicao_id', edicaoId).order('ordem', { ascending: true });
  if (error) return { data: [], error };
  return { data: data.map(materiaFromDb), error: null };
}

export async function sbCreateMateria({ edicaoId, caderno, orgaoId, titulo, corpo, ordem }) {
  const sb = getSupabase();
  const { data, error } = await sb.from('diario_materias').insert({
    edicao_id: edicaoId, caderno, orgao_id: orgaoId || null, titulo, corpo, ordem: ordem || 0,
  }).select().single();
  return { data: data ? materiaFromDb(data) : null, error };
}

export async function sbUpdateMateria(id, { caderno, orgaoId, titulo, corpo, ordem }) {
  const sb = getSupabase();
  const { data, error } = await sb.from('diario_materias').update({
    caderno, orgao_id: orgaoId || null, titulo, corpo, ordem, updated_at: new Date().toISOString(),
  }).eq('id', id).select().single();
  return { data: data ? materiaFromDb(data) : null, error };
}

export async function sbDeleteMateria(id) {
  const sb = getSupabase();
  return sb.from('diario_materias').delete().eq('id', id);
}

// ── Órgãos (leitura, para o seletor da matéria — CRUD fica no AdminPanel) ──
export async function sbListOrgaosSimples() {
  const sb = getSupabase();
  const { data, error } = await sb.from('orgaos').select('id, nome').order('nome');
  return { data: data || [], error };
}
