// Diagnóstico pós-migration do módulo Diário Oficial — roda com chave anon
// (mesmo padrão de scripts/diag-lexcore.mjs), só confirma existência de
// tabelas/bucket/função, não testa fluxo completo (precisa de sessão
// autenticada de um tenant real pra isso).
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xqlrfsrjvqmucchzpapk.supabase.co';
const ANON_KEY = 'sb_publishable_4t3DTecH3GAtG6t-Q2UZ3w_Mwuyemgc';

const sb = createClient(SUPABASE_URL, ANON_KEY);

async function checkTable(nome) {
  const { error } = await sb.from(nome).select('*').limit(1);
  if (error && error.code === '42P01') {
    console.log(`❌ tabela "${nome}" NÃO existe — ${error.message}`);
    return false;
  }
  if (error) {
    console.log(`✅ tabela "${nome}" existe (query bloqueada como esperado: ${error.message})`);
    return true;
  }
  console.log(`✅ tabela "${nome}" existe (${error ? '' : 'select ok'})`);
  return true;
}

async function checkBucket() {
  const { data, error } = await sb.storage.from('diario-oficial-pdfs').list('', { limit: 1 });
  if (error) {
    console.log(`❌ bucket "diario-oficial-pdfs" — erro: ${error.message}`);
    return false;
  }
  console.log(`✅ bucket "diario-oficial-pdfs" existe (${data.length} itens na raiz)`);
  return true;
}

async function checkFuncao() {
  const { error } = await sb.rpc('diario_proxima_numeracao', { p_tenant_id: '00000000-0000-0000-0000-000000000000' });
  if (error && /could not find function|does not exist/i.test(error.message)) {
    console.log(`❌ função diario_proxima_numeracao NÃO existe — ${error.message}`);
    return false;
  }
  console.log(`✅ função diario_proxima_numeracao existe (chamada retornou: ${error ? error.message : 'sucesso'})`);
  return true;
}

const r1 = await checkTable('diario_edicoes');
const r2 = await checkTable('diario_materias');
const r3 = await checkTable('diario_config');
const r4 = await checkBucket();
const r5 = await checkFuncao();

console.log('\nResumo:', { diario_edicoes: r1, diario_materias: r2, diario_config: r3, bucket: r4, funcao: r5 });
