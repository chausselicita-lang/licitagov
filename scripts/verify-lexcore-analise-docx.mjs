// Verificação standalone (sem Supabase) — confirma que
// buildLexcoreAnaliseDocx gera um buffer .docx válido (assinatura ZIP/PK)
// e que nomeArquivoAnalise sanitiza corretamente.
// Uso: node scripts/verify-lexcore-analise-docx.mjs
import assert from 'node:assert/strict';
import { buildLexcoreAnaliseDocx, nomeArquivoAnalise } from '../src/lib/lexcoreAnaliseDocx.js';

const pontosDeTeste = [
  { trechoEdital: "Exige-se capital social de 30%.", tipoProblema: "ilegal", descricaoProblema: "Extrapola o limite legal.", fundamentacaoLegal: "Art. 69, I da Lei 14.133/2021.", artigoLei: "Art. 69, I", nivelRisco: "alto" },
  { trechoEdital: "Prazo de entrega de 2 dias úteis.", tipoProblema: "restritivo", descricaoProblema: "Prazo exíguo demais.", fundamentacaoLegal: "Princípio da competitividade.", artigoLei: "", nivelRisco: "medio" },
];

const buf = await buildLexcoreAnaliseDocx({
  nomeEdital: "Pregão Eletrônico nº 004/2026",
  numeroProcesso: "2026.004.0001",
  dataAnaliseISO: new Date().toISOString(),
  orgaoNome: "Prefeitura de Teste",
  pontos: pontosDeTeste,
});
assert.ok(Buffer.isBuffer(buf), "esperado um Buffer");
assert.ok(buf.length > 1000, "buffer parece pequeno demais pra um .docx válido");
assert.equal(buf.slice(0, 2).toString(), "PK", "assinatura ZIP/PK ausente — .docx inválido");
console.log(`OK: .docx gerado, ${buf.length} bytes, assinatura PK válida.`);

const buf0 = await buildLexcoreAnaliseDocx({ nomeEdital: "Teste vazio", numeroProcesso: null, dataAnaliseISO: null, orgaoNome: null, pontos: [] });
assert.ok(buf0.length > 500, "deve gerar documento mesmo com 0 pontos");
console.log("OK: gera .docx mesmo com 0 pontos críticos.");

const nome = nomeArquivoAnalise({ nomeEdital: "Pregão Eletrônico nº 004/2026", numeroProcesso: "2026.004.0001" });
assert.match(nome, /^Analise_Pregao_Eletronico_n__004_2026_2026\.004\.0001_\d{4}-\d{2}-\d{2}\.docx$/);
console.log("OK: nomeArquivoAnalise —", nome);

const nomeSemProcesso = nomeArquivoAnalise({ nomeEdital: "Edital X", numeroProcesso: "" });
assert.match(nomeSemProcesso, /^Analise_Edital_X_sem_numero_\d{4}-\d{2}-\d{2}\.docx$/);
console.log("OK: nomeArquivoAnalise sem número de processo —", nomeSemProcesso);
