// Script ad-hoc: valida a geração do DFD (Planejamento Assistido por IA)
// chamando a Anthropic diretamente com o mesmo system prompt usado no app.
// Não faz parte do build/produção.
import { buildDfdSystem, buildDfdUserText } from "../src/lib/planejamentoPrompts.js";

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

const system = buildDfdSystem();
const userText = buildDfdUserText({ intake, agente });

// Usa o proxy já deployado em produção (mesma rota que o app usa via
// anthropicFetch) em vez da API da Anthropic direto — evita precisar da
// ANTHROPIC_API_KEY localmente, e testa o caminho real fim a fim.
const resp = await fetch("https://licitagov-one.vercel.app/api/claude", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: userText }],
  }),
});

const json = await resp.json();
if (!resp.ok) {
  console.error("ERRO", resp.status, JSON.stringify(json));
  process.exit(1);
}
const texto = json.content?.[0]?.text || "";
console.log("=== USER TEXT ENVIADO ===\n" + userText + "\n");
console.log("=== DFD GERADO ===\n" + texto);
console.log("\n=== META ===", "stop_reason=", json.stop_reason, "chars=", texto.length);
