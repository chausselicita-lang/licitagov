// Teste unitário puro (sem rede) — src/lib/lexcoreRespostaLegal.js
// Uso: node scripts/test-lexcore-resposta-legal.mjs
import assert from 'node:assert/strict';
import {
  TIPOS_RESPOSTA, labelTipoResposta, buildRespostaSystem, buildRespostaUserText,
} from '../src/lib/lexcoreRespostaLegal.js';

// TIPOS_RESPOSTA tem exatamente os 2 valores aceitos pelo check constraint
// de lexcore_respostas.tipo_resposta (supabase/migration_lexcore_respostas.sql)
assert.deepEqual(TIPOS_RESPOSTA.map(t => t.value), ['resposta_impugnacao', 'contrarrazoes']);
console.log('OK: TIPOS_RESPOSTA bate com o check constraint da migration');

assert.equal(labelTipoResposta('resposta_impugnacao'), 'Resposta à Impugnação');
assert.equal(labelTipoResposta('contrarrazoes'), 'Contrarrazões');
assert.equal(labelTipoResposta('tipo_inexistente'), 'tipo_inexistente');
console.log('OK: labelTipoResposta');

const sys = buildRespostaSystem('Resposta à Impugnação');
assert.ok(sys.includes('ÓRGÃO LICITANTE'), 'system prompt deve deixar claro que a IA fala pelo órgão, não pelo impugnante');
assert.ok(sys.includes('Resposta à Impugnação'));
console.log('OK: buildRespostaSystem');

const userText = buildRespostaUserText({ tipoRespostaLabel: 'Contrarrazões', nomeReferencia: 'Pregão 01/2026', numeroProcesso: '2026.1' });
assert.ok(userText.includes('Pregão 01/2026'));
assert.ok(userText.includes('2026.1'));
assert.ok(userText.includes('Contrarrazões'));
console.log('OK: buildRespostaUserText com campos preenchidos');

const userTextVazio = buildRespostaUserText({ tipoRespostaLabel: 'Contrarrazões', nomeReferencia: '', numeroProcesso: '' });
assert.ok(userTextVazio.includes('não informado'));
console.log('OK: buildRespostaUserText com campos vazios');

console.log('\n✅ Todos os testes de lexcoreRespostaLegal.js passaram');
