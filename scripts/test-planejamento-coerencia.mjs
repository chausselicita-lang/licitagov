// Script ad-hoc: gera a cascata completa (DFD/ETP/TR/Mapa de Riscos) e roda
// o Verificador de Coerência em dois cenários — (A) peças coerentes entre
// si, (B) com uma divergência de valor injetada de propósito no TR — pra
// confirmar que o verificador acusa a divergência quando ela existe e não
// gera falso positivo quando não existe. Não faz parte do build/produção.
import {
  buildDfdSystem, buildDfdUserText, DFD_MAX_TOKENS,
  buildEtpSystem, buildEtpUserText, ETP_MAX_TOKENS,
  buildTrSystem, buildTrUserText, TR_MAX_TOKENS,
  buildMapaRiscosSystem, buildMapaRiscosUserText, parseRiscosJSON, montarConteudoMapaRiscos, MAPA_RISCOS_MAX_TOKENS,
  buildCoerenciaSystem, buildCoerenciaUserText, parseContradicoesJSON, statusGeralCoerencia, COERENCIA_MAX_TOKENS,
} from "../src/lib/planejamentoPrompts.js";

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

const intake = {
  numeroProcesso: "2026.003.0091-TESTE",
  objeto: "Aquisição de material permanente para reforma da UBS Central",
  justificativaResumida: "A UBS Central atende cerca de 3.000 famílias e o mobiliário atual está deteriorado.",
  quantidadeEstimada: 45,
  valorEstimado: 187500.00,
  areaRequisitante: "Secretaria Municipal de Saúde",
  tipoContratacao: "bens",
};
const agente = { nome: "Marcos Andrade", email: "marcos.andrade@mascote.ba.gov.br", prefeitura: "Mascote", municipio: "Mascote" };

console.log(">>> Gerando cascata completa...");
const dfdConteudo = await chamarClaude(buildDfdSystem(), buildDfdUserText({ intake, agente }), DFD_MAX_TOKENS);
console.log("dfd chars=", dfdConteudo.length);
const respostas = {
  alternativa_mercado: "Ata de registro de preços da Secretaria de Administração não contempla mobiliário clínico específico; opta-se pela contratação própria.",
  contratacoes_correlatas: "Relaciona-se à reforma estrutural já contratada (Processo nº 2026.002.0050).",
};
const etpConteudo = await chamarClaude(buildEtpSystem(), buildEtpUserText({ intake, dfdConteudo, respostas }), ETP_MAX_TOKENS);
console.log("etp chars=", etpConteudo.length);
const trConteudo = await chamarClaude(buildTrSystem(), buildTrUserText({ intake, dfdConteudo, etpConteudo }), TR_MAX_TOKENS);
console.log("tr chars=", trConteudo.length);
const riscosTexto = await chamarClaude(buildMapaRiscosSystem(), buildMapaRiscosUserText({ intake, trConteudo }), MAPA_RISCOS_MAX_TOKENS);
const riscos = parseRiscosJSON(riscosTexto);
const mapaConteudo = montarConteudoMapaRiscos({ intake, agente, riscos });
console.log("mapa riscos:", riscos.length, "chars=", mapaConteudo.length);

console.log("\n>>> Cenário A — peças coerentes (como geradas)...");
const respA = await chamarClaude(
  buildCoerenciaSystem(),
  buildCoerenciaUserText({ dfdConteudo, etpConteudo, trConteudo, mapaRiscosConteudo: mapaConteudo }),
  COERENCIA_MAX_TOKENS
);
const contradicoesA = parseContradicoesJSON(respA);
console.log("Cenário A — contradições encontradas:", contradicoesA.length, "status:", statusGeralCoerencia(contradicoesA));
console.log(JSON.stringify(contradicoesA, null, 2));

console.log("\n>>> Cenário B — TR com valor e quantidade alterados de propósito...");
const trAdulterado = trConteudo
  .replace(/187\.500,00/g, "142.000,00")
  .replace(/45 \(quarenta e cinco\)/g, "60 (sessenta)");
const respB = await chamarClaude(
  buildCoerenciaSystem(),
  buildCoerenciaUserText({ dfdConteudo, etpConteudo, trConteudo: trAdulterado, mapaRiscosConteudo: mapaConteudo }),
  COERENCIA_MAX_TOKENS
);
const contradicoesB = parseContradicoesJSON(respB);
console.log("Cenário B — contradições encontradas:", contradicoesB.length, "status:", statusGeralCoerencia(contradicoesB));
console.log(JSON.stringify(contradicoesB, null, 2));
