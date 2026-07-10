import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY não encontrada no .env');

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

console.log('--- Tabelas ---');
for (const t of ['lexcore_analises', 'lexcore_pontos_criticos', 'lexcore_pecas']) {
  const { error } = await sb.from(t).select('id').limit(1);
  console.log(t, error ? `ERRO: ${error.message}` : 'OK (existe)');
}

console.log('--- Buckets ---');
const { data: buckets, error: bErr } = await sb.storage.listBuckets();
if (bErr) console.log('Erro ao listar buckets:', bErr.message);
else console.log('Buckets existentes:', buckets.map(b => b.id).join(', ') || '(nenhum)');

const jaExiste = buckets?.some(b => b.id === 'lexcore-docs');
if (!jaExiste) {
  console.log('--- Criando bucket lexcore-docs via Storage API ---');
  const { data, error } = await sb.storage.createBucket('lexcore-docs', {
    public: true,
    fileSizeLimit: 26214400,
    allowedMimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  });
  console.log(error ? `ERRO ao criar bucket: ${error.message}` : `Bucket criado: ${JSON.stringify(data)}`);
} else {
  console.log('Bucket lexcore-docs já existe.');
}
