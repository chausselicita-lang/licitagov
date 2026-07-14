// Verificação manual (usa Supabase real) — cria, lê, atualiza e apaga uma
// resposta de teste na tabela lexcore_respostas para confirmar que a
// migration foi aplicada e o schema bate com lexcoreRespostaDb.js.
// Uso: node scripts/verify-lexcore-resposta-db.mjs
// Pré-requisito: SUPABASE_SERVICE_KEY no .env (mesmo usado por diag-lexcore.mjs)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; })
);

const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY não encontrada no .env');

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: created, error: eCreate } = await sb.from('lexcore_respostas').insert({
  tipo_resposta: 'resposta_impugnacao',
  nome_referencia: 'Pregão de teste — verify script',
  numero_processo: '2026.999.VERIFY',
  conteudo_gerado: 'Conteúdo de teste gerado pelo script de verificação.',
}).select().single();
assert.equal(eCreate, null, `insert falhou: ${eCreate?.message}`);
assert.equal(created.status, 'rascunho');
console.log('OK: insert em lexcore_respostas —', created.id);

const { data: fetched, error: eGet } = await sb.from('lexcore_respostas').select('*').eq('id', created.id).single();
assert.equal(eGet, null);
assert.equal(fetched.tipo_resposta, 'resposta_impugnacao');
console.log('OK: select por id');

const { data: updated, error: eUpdate } = await sb.from('lexcore_respostas')
  .update({ status: 'finalizada' }).eq('id', created.id).select().single();
assert.equal(eUpdate, null);
assert.equal(updated.status, 'finalizada');
console.log('OK: update de status');

const { error: eDelete } = await sb.from('lexcore_respostas').delete().eq('id', created.id);
assert.equal(eDelete, null);
console.log('OK: delete');

console.log('\n✅ Tabela lexcore_respostas validada de ponta a ponta (insert/select/update/delete)');
