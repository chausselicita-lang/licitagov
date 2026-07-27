import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: { sizeLimit: '30mb' } } };

const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const BUCKET = 'lexcore-docs';
const DIACRITICS_RE = new RegExp('[̀-ͯ]', 'g');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel' });

  const { fileName, fileType, fileBase64 } = req.body || {};
  if (!fileName || !fileBase64) {
    return res.status(400).json({ error: 'fileName e fileBase64 são obrigatórios' });
  }
  if (fileType && fileType !== 'application/pdf') {
    return res.status(400).json({ error: 'Apenas arquivos PDF são aceitos' });
  }

  const sb = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    // Nomes de edital em PT-BR quase sempre têm acento/caractere especial
    // ("Pregão", "Licitação", "nº", "/") — o Supabase Storage rejeita esses
    // bytes na key do objeto ("Invalid key"). Normaliza pra ASCII seguro.
    const safeName = fileName
      .normalize('NFD').replace(DIACRITICS_RE, '')
      .replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `editais/${crypto.randomUUID()}-${safeName}`;

    const upload = await sb.storage.from(BUCKET).upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (upload.error) throw upload.error;

    const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    return res.json({ url });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
