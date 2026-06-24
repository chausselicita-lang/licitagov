import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };

const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const BUCKET = 'checklist-pdfs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel' });

  const { filename } = req.body || {};
  if (!filename) return res.status(400).json({ error: 'filename obrigatório' });

  const sb = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `tmp/${crypto.randomUUID()}/${safeName}`;

  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) return res.status(500).json({ error: error.message });

  const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(path);

  return res.json({ token: data.token, path, publicUrl: urlData.publicUrl });
}
