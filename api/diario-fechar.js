import { createClient } from '@supabase/supabase-js';
import { buildEdicaoPdfBuffer } from '../src/lib/diarioPdf.js';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const BUCKET = 'diario-oficial-pdfs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel' });

  const { edicaoId } = req.body || {};
  if (!edicaoId) return res.status(400).json({ error: 'edicaoId é obrigatório' });

  const sb = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: edicao, error: eEdicao } = await sb.from('diario_edicoes').select('*').eq('id', edicaoId).single();
    if (eEdicao || !edicao) return res.status(404).json({ error: 'Edição não encontrada' });
    if (edicao.status === 'publicada') return res.status(400).json({ error: 'Edição já publicada' });

    const { data: materiasRaw, error: eMaterias } = await sb
      .from('diario_materias')
      .select('*, orgaos(nome)')
      .eq('edicao_id', edicaoId)
      .order('ordem', { ascending: true });
    if (eMaterias) throw eMaterias;
    if (!materiasRaw || materiasRaw.length === 0) {
      return res.status(400).json({ error: 'Adicione ao menos uma matéria antes de publicar a edição' });
    }

    const { data: tenant } = await sb.from('tenants').select('municipio, uf').eq('id', edicao.tenant_id).single();

    const { data: numeracao, error: eNum } = await sb.rpc('diario_proxima_numeracao', { p_tenant_id: edicao.tenant_id }).single();
    if (eNum) throw eNum;

    const materias = materiasRaw.map(m => ({
      caderno: m.caderno, titulo: m.titulo, corpo: m.corpo, orgaoNome: m.orgaos?.nome || '',
    }));

    const pdfBuf = await buildEdicaoPdfBuffer({
      municipio: tenant?.municipio, uf: tenant?.uf,
      numero: numeracao.numero, anoSerie: numeracao.ano_serie,
      dataPublicacao: edicao.data_publicacao, materias,
    });

    const path = `${edicao.tenant_id}/${numeracao.numero}-${numeracao.ano_serie}.pdf`;
    const upload = await sb.storage.from(BUCKET).upload(path, pdfBuf, { contentType: 'application/pdf', upsert: true });
    if (upload.error) throw upload.error;

    const pdfUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    const { data: edicaoAtualizada, error: eUpdate } = await sb.from('diario_edicoes').update({
      numero: numeracao.numero, ano_serie: numeracao.ano_serie, pdf_url: pdfUrl,
      status: 'publicada', fechada_em: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', edicaoId).select().single();
    if (eUpdate) throw eUpdate;

    return res.json({ edicao: edicaoAtualizada, pdfUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
