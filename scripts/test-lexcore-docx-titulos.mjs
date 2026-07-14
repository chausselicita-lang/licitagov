// Teste unitário puro (sem rede) — confirma que a nova entrada em
// TITULOS_PECA (src/lib/lexcoreDocx.js) foi adicionada sem quebrar as
// existentes. TITULOS_PECA não é exportado, então testamos indiretamente
// via nomeArquivoPeca, que é a função pública que a usa.
// Uso: node scripts/test-lexcore-docx-titulos.mjs
import assert from 'node:assert/strict';
import { nomeArquivoPeca } from '../src/lib/lexcoreDocx.js';

assert.equal(nomeArquivoPeca({ tipoPeca: 'resposta_impugnacao' }), 'resposta-impugna-o.docx');
console.log('OK: novo tipo resposta_impugnacao gera nome de arquivo correto');

assert.equal(nomeArquivoPeca({ tipoPeca: 'contrarrazoes' }), 'contrarraz-es-de-recurso.docx');
console.log('OK: tipo contrarrazoes existente continua funcionando (reaproveitado pela resposta)');

assert.equal(nomeArquivoPeca({ tipoPeca: 'impugnacao' }), 'impugna-o-ao-edital.docx');
console.log('OK: tipo impugnacao existente (fluxo de análise, intocado) continua funcionando');

console.log('\n✅ Todos os testes de TITULOS_PECA em lexcoreDocx.js passaram');
