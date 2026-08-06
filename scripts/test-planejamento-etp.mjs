// Script ad-hoc: valida a geração do ETP a partir de um DFD já gerado,
// nos dois cenários (perguntas complementares puladas vs. respondidas).
// Não faz parte do build/produção.
import { buildDfdSystem, buildDfdUserText, buildEtpSystem, buildEtpUserText, ETP_PERGUNTAS_COMPLEMENTARES, DFD_MAX_TOKENS, ETP_MAX_TOKENS } from "../src/lib/planejamentoPrompts.js";

async function chamarClaude(system, userText, maxTokens = 4096) {
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
  objeto: "Aquisição de material permanente para reforma da UBS Central",
  justificativaResumida: "A UBS Central atende cerca de 3.000 famílias e o mobiliário atual está deteriorado, comprometendo o atendimento e a ergonomia dos profissionais de saúde.",
  quantidadeEstimada: "45 itens (mobiliário clínico e administrativo)",
  valorEstimado: 187500.00,
  areaRequisitante: "Secretaria Municipal de Saúde",
  tipoContratacao: "bens",
  numeroProcesso: "2026.003.0091",
};
const agente = { nome: "Marcos Andrade", email: "marcos.andrade@mascote.ba.gov.br", prefeitura: "Mascote", municipio: "Mascote" };

console.log(">>> Gerando DFD base...");
const dfdConteudo = await chamarClaude(buildDfdSystem(), buildDfdUserText({ intake, agente }), DFD_MAX_TOKENS);
console.log("DFD ok, chars=", dfdConteudo.length);

console.log("\n>>> Cenário A — perguntas complementares PULADAS (resposta padrão)...");
const etpA = await chamarClaude(buildEtpSystem(), buildEtpUserText({ intake, dfdConteudo, respostas: {} }), ETP_MAX_TOKENS);
console.log("=== ETP (cenário A, sem respostas) ===\n" + etpA);
console.log("\nchars=", etpA.length, "termina com 'DECLARAÇÃO DE VIABILIDADE'?", etpA.includes("DECLARAÇÃO DE VIABILIDADE"));

console.log("\n>>> Cenário B — perguntas complementares RESPONDIDAS...");
const respostas = {
  alternativa_mercado: "Foi verificado que a Secretaria de Administração possui ata de registro de preços vigente para mobiliário administrativo padrão, mas ela não contempla mobiliário clínico específico, motivo pelo qual se opta pela contratação própria para a totalidade dos itens.",
  contratacoes_correlatas: "Esta contratação está relacionada à reforma estrutural da UBS Central, cujo contrato de obras já foi celebrado (Processo nº 2026.002.0050), sendo o mobiliário necessário para a entrega final da unidade reformada.",
};
const etpB = await chamarClaude(buildEtpSystem(), buildEtpUserText({ intake, dfdConteudo, respostas }), ETP_MAX_TOKENS);
console.log("=== ETP (cenário B, com respostas) ===\n" + etpB);
console.log("\nchars=", etpB.length, "termina com 'DECLARAÇÃO DE VIABILIDADE'?", etpB.includes("DECLARAÇÃO DE VIABILIDADE"));
