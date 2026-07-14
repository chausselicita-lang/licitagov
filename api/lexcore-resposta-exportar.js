import { createClient } from '@supabase/supabase-js';
import { buildLexcorePecaDocx, nomeArquivoPeca } from '../src/lib/lexcoreDocx.js';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const BUCKET = 'lexcore-docs';
const TIPOS_VALIDOS = ['resposta_impugnacao', 'contrarrazoes'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel' });

  const { respostaId, tipoResposta, conteudoGerado, nomeReferencia, numeroProcesso } = req.body || {};
  if (!respostaId || !tipoResposta || !conteudoGerado) {
    return res.status(400).json({ error: 'respostaId, tipoResposta e conteudoGerado são obrigatórios' });
  }
  if (!TIPOS_VALIDOS.includes(tipoResposta)) {
    return res.status(400).json({ error: `tipoResposta inválido: ${tipoResposta}` });
  }

  const sb = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const docxBuf = await buildLexcorePecaDocx({ tipoPeca: tipoResposta, conteudoGerado, nomeEdital: nomeReferencia, numeroProcesso });
    const nomeArquivo = nomeArquivoPeca({ tipoPeca: tipoResposta, numeroProcesso });
    const path = `respostas/${respostaId}/${nomeArquivo}`;

    const upload = await sb.storage.from(BUCKET).upload(path, docxBuf, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    });
    if (upload.error) throw upload.error;

    const docxUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    const { data: row, error } = await sb.from('lexcore_respostas')
      .update({ arquivo_docx_url: docxUrl, status: 'finalizada', updated_at: new Date().toISOString() })
      .eq('id', respostaId)
      .select()
      .single();
    if (error) throw error;

    return res.json({ resposta: row, docxUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
