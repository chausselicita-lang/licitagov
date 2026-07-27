import { createClient } from '@supabase/supabase-js';
import { buildLexcoreAnaliseDocx, nomeArquivoAnalise } from '../src/lib/lexcoreAnaliseDocx.js';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const BUCKET = 'lexcore-docs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel' });

  const { analiseId, nomeEdital, numeroProcesso, orgaoNome, dataAnaliseISO, pontos, tenantId, usuarioId, usuarioEmail } = req.body || {};
  if (!analiseId) return res.status(400).json({ error: 'analiseId é obrigatório' });
  if (!Array.isArray(pontos)) return res.status(400).json({ error: 'pontos precisa ser um array (pode ser vazio)' });

  const sb = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let docxUrl;
  try {
    const docxBuf = await buildLexcoreAnaliseDocx({ nomeEdital, numeroProcesso, dataAnaliseISO, orgaoNome, pontos });
    const nomeArquivo = nomeArquivoAnalise({ nomeEdital, numeroProcesso });
    const path = `analises/${analiseId}/${nomeArquivo}`;

    const upload = await sb.storage.from(BUCKET).upload(path, docxBuf, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    });
    if (upload.error) throw upload.error;

    docxUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }

  // Audit log é best-effort: se falhar, não deve impedir o download do
  // relatório que já foi gerado com sucesso — só loga no console do Vercel.
  try {
    await sb.from('lexcore_export_logs').insert({
      analise_id: analiseId,
      tenant_id: tenantId || null,
      usuario_id: usuarioId || null,
      usuario_email: usuarioEmail || null,
    });
  } catch (logErr) {
    console.error('lexcore-analise-exportar: falha ao gravar audit log', logErr);
  }

  return res.json({ docxUrl });
}
