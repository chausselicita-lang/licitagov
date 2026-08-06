// Script ad-hoc: gera a cascata completa e testa buildPlanejamentoDocx()
// pras 4 peças, salvando os .docx em disco pra inspeção manual e conferindo
// que os blocos tabulares (TR e Mapa de Riscos) viraram tabelas de verdade
// (word/document.xml contém <w:tbl>), não texto com "|" solto.
// Não faz parte do build/produção.
import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import {
  buildDfdSystem, buildDfdUserText, DFD_MAX_TOKENS,
  buildEtpSystem, buildEtpUserText, ETP_MAX_TOKENS,
  buildTrSystem, buildTrUserText, TR_MAX_TOKENS,
  buildMapaRiscosSystem, buildMapaRiscosUserText, parseRiscosJSON, montarConteudoMapaRiscos, MAPA_RISCOS_MAX_TOKENS,
} from "../src/lib/planejamentoPrompts.js";
import { buildPlanejamentoDocx, nomeArquivoPlanejamento } from "../src/lib/planejamentoDocx.js";

async function chamarClaude(system, userText, maxTokens) {
  const resp = await fetch("https://licitagov-one.vercel.app/api/claude", {
    method: "POST",
    headers: { "content-type": "application/json", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: maxTokens, system, messages: [{ role: "user", content: userText }] }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${JSON.stringify(json)}`);
  return json.content?.[0]?.text || "";
}

const outDir = "C:/Users/CLERIS~1/AppData/Local/Temp/claude/C--Users-CLERISTON/7bc88e4b-5f55-4602-a1a0-0d2af0b217de/scratchpad/docx-test";
mkdirSync(outDir, { recursive: true });

const intake = {
  numeroProcesso: "2026.003.0091",
  objeto: "Aquisição de material permanente para reforma da UBS Central",
  justificativaResumida: "A UBS Central atende cerca de 3.000 famílias e o mobiliário atual está deteriorado.",
  quantidadeEstimada: 45,
  valorEstimado: 187500.00,
  areaRequisitante: "Secretaria Municipal de Saúde",
  tipoContratacao: "bens",
};
const agente = { nome: "Marcos Andrade", email: "marcos.andrade@mascote.ba.gov.br", prefeitura: "Mascote", municipio: "Mascote" };

console.log(">>> Gerando cascata...");
const dfdConteudo = await chamarClaude(buildDfdSystem(), buildDfdUserText({ intake, agente }), DFD_MAX_TOKENS);
const respostas = {
  alternativa_mercado: "Ata da Secretaria de Administração não contempla mobiliário clínico; opta-se pela contratação própria.",
  contratacoes_correlatas: "Relaciona-se à reforma estrutural já contratada (Processo nº 2026.002.0050).",
};
const etpConteudo = await chamarClaude(buildEtpSystem(), buildEtpUserText({ intake, dfdConteudo, respostas }), ETP_MAX_TOKENS);
const trConteudo = await chamarClaude(buildTrSystem(), buildTrUserText({ intake, dfdConteudo, etpConteudo }), TR_MAX_TOKENS);
const riscosTexto = await chamarClaude(buildMapaRiscosSystem(), buildMapaRiscosUserText({ intake, trConteudo }), MAPA_RISCOS_MAX_TOKENS);
const riscos = parseRiscosJSON(riscosTexto);
const mapaConteudo = montarConteudoMapaRiscos({ intake, agente, riscos });
console.log("cascata gerada. dfd/etp/tr/mapa chars:", dfdConteudo.length, etpConteudo.length, trConteudo.length, mapaConteudo.length);

const pecas = [
  { tipoPeca: "dfd", conteudoGerado: dfdConteudo },
  { tipoPeca: "etp", conteudoGerado: etpConteudo },
  { tipoPeca: "tr", conteudoGerado: trConteudo },
  { tipoPeca: "mapa_riscos", conteudoGerado: mapaConteudo },
];

for (const p of pecas) {
  const buf = await buildPlanejamentoDocx({ tipoPeca: p.tipoPeca, conteudoGerado: p.conteudoGerado, processoObjeto: intake.objeto, numeroProcesso: intake.numeroProcesso });
  const nome = nomeArquivoPlanejamento({ tipoPeca: p.tipoPeca, numeroProcesso: intake.numeroProcesso });
  const path = `${outDir}/${nome}`;
  writeFileSync(path, buf);
  console.log(`${p.tipoPeca}: ${nome} — ${buf.length} bytes`);
}

console.log("\n>>> Verificando se TR e Mapa de Riscos geraram tabelas de verdade (<w:tbl> no XML)...");
for (const tipoPeca of ["tr", "mapa_riscos"]) {
  const nome = nomeArquivoPlanejamento({ tipoPeca, numeroProcesso: intake.numeroProcesso });
  const path = `${outDir}/${nome}`;
  const xml = execSync(`unzip -p "${path}" word/document.xml`).toString();
  const numTabelas = (xml.match(/<w:tbl>/g) || []).length;
  console.log(`${tipoPeca}: ${numTabelas} tabela(s) encontrada(s) no XML`);
}
console.log("\n>>> Verificando DFD/ETP (sem tabela esperada, só parágrafos)...");
for (const tipoPeca of ["dfd", "etp"]) {
  const nome = nomeArquivoPlanejamento({ tipoPeca, numeroProcesso: intake.numeroProcesso });
  const path = `${outDir}/${nome}`;
  const xml = execSync(`unzip -p "${path}" word/document.xml`).toString();
  const numTabelas = (xml.match(/<w:tbl>/g) || []).length;
  console.log(`${tipoPeca}: ${numTabelas} tabela(s) (esperado 0)`);
}
