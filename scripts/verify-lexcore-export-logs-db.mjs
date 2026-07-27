// Verificação manual (usa Supabase real) — confirma que a tabela
// lexcore_export_logs existe e aceita insert via service role com o
// schema esperado pelo endpoint api/lexcore-analise-exportar.js.
// Uso: node scripts/verify-lexcore-export-logs-db.mjs
// Pré-requisito: SUPABASE_SERVICE_KEY no .env, migration já aplicada,
// e pelo menos uma linha em lexcore_analises (usa a mais recente).
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; })
);
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: analise, error: eA } = await sb.from('lexcore_analises').select('id, tenant_id').limit(1).single();
assert.equal(eA, null, `precisa de pelo menos 1 lexcore_analises pra testar: ${eA?.message}`);

const { data: created, error: eCreate } = await sb.from('lexcore_export_logs').insert({
  analise_id: analise.id,
  tenant_id: analise.tenant_id,
  usuario_id: null,
  usuario_email: 'verify-script@teste.local',
}).select().single();
assert.equal(eCreate, null, `insert falhou: ${eCreate?.message}`);
console.log('OK: insert em lexcore_export_logs —', created.id);

await sb.from('lexcore_export_logs').delete().eq('id', created.id);
console.log('OK: linha de teste removida.');
