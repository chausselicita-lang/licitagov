// Script ad-hoc: gera DFD + ETP + TR + Mapa de Riscos de teste e grava em
// cascata real no banco via service role. Não faz parte do build/produção.
import {
  buildDfdSystem, buildDfdUserText, DFD_MAX_TOKENS,
  buildEtpSystem, buildEtpUserText, ETP_MAX_TOKENS,
  buildTrSystem, buildTrUserText, TR_MAX_TOKENS,
  buildMapaRiscosSystem, buildMapaRiscosUserText, parseRiscosJSON, montarConteudoMapaRiscos, MAPA_RISCOS_MAX_TOKENS,
} from "../src/lib/planejamentoPrompts.js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
const URL_BASE = "https://xqlrfsrjvqmucchzpapk.supabase.co";
const TENANT_ID = "80ac4d6a-3e40-4cad-9077-a8d2ce510323";

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

async function sb(path, method, body) {
  const resp = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await resp.json().catch(() => null);
  return { status: resp.status, json };
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

console.log(">>> 1. cria processo");
const proc = await sb("planejamento_processos", "POST", {
  tenant_id: TENANT_ID, numero_processo: intake.numeroProcesso, objeto: intake.objeto,
  justificativa_resumida: intake.justificativaResumida, quantidade_estimada: intake.quantidadeEstimada,
  valor_estimado: intake.valorEstimado, area_requisitante: intake.areaRequisitante, tipo_contratacao: intake.tipoContratacao,
});
const processoId = proc.json[0].id;
console.log("processo status=", proc.status, processoId);

console.log(">>> 2. DFD");
const dfdConteudo = await chamarClaude(buildDfdSystem(), buildDfdUserText({ intake, agente }), DFD_MAX_TOKENS);
await sb("planejamento_dfd", "POST", { processo_id: processoId, tenant_id: TENANT_ID, conteudo_gerado: dfdConteudo });
console.log("dfd chars=", dfdConteudo.length);

console.log(">>> 3. ETP");
const respostas = {
  alternativa_mercado: "Ata de registro de preços da Secretaria de Administração não contempla mobiliário clínico específico; opta-se pela contratação própria.",
  contratacoes_correlatas: "Relaciona-se à reforma estrutural já contratada (Processo nº 2026.002.0050).",
};
const etpConteudo = await chamarClaude(buildEtpSystem(), buildEtpUserText({ intake, dfdConteudo, respostas }), ETP_MAX_TOKENS);
await sb("planejamento_etp", "POST", { processo_id: processoId, tenant_id: TENANT_ID, conteudo_gerado: etpConteudo });
console.log("etp chars=", etpConteudo.length);

console.log(">>> 4. TR");
const trConteudo = await chamarClaude(buildTrSystem(), buildTrUserText({ intake, dfdConteudo, etpConteudo }), TR_MAX_TOKENS);
await sb("planejamento_tr", "POST", { processo_id: processoId, tenant_id: TENANT_ID, conteudo_gerado: trConteudo });
console.log("tr chars=", trConteudo.length);

console.log(">>> 5. Mapa de Riscos");
const riscosTexto = await chamarClaude(buildMapaRiscosSystem(), buildMapaRiscosUserText({ intake, trConteudo }), MAPA_RISCOS_MAX_TOKENS);
console.log("resposta bruta da IA (riscos), chars=", riscosTexto.length);
const riscos = parseRiscosJSON(riscosTexto);
console.log("riscos parseados:", riscos.length, "- por fase:", {
  planejamento: riscos.filter(r => r.fase === "planejamento").length,
  selecao: riscos.filter(r => r.fase === "selecao").length,
  execucao: riscos.filter(r => r.fase === "execucao").length,
});
const conteudoMapa = montarConteudoMapaRiscos({ intake, agente, riscos });
const mapa = await sb("planejamento_mapa_riscos", "POST", { processo_id: processoId, tenant_id: TENANT_ID, riscos, conteudo_gerado: conteudoMapa });
console.log("mapa status=", mapa.status, "chars=", conteudoMapa.length);
if (mapa.status >= 400) console.log(JSON.stringify(mapa.json));
await sb(`planejamento_processos?id=eq.${processoId}`, "PATCH", { status: "mapa_riscos_gerado" });

console.log("\n=== MAPA DE RISCOS (texto montado) ===\n" + conteudoMapa);

console.log(">>> 6. releitura pra conferir riscos jsonb");
const releitura = await sb(`planejamento_mapa_riscos?processo_id=eq.${processoId}&select=riscos`, "GET");
console.log("releitura status=", releitura.status, "riscos count=", releitura.json[0]?.riscos?.length);

console.log(">>> 7. limpeza");
console.log("delete mapa:", (await sb(`planejamento_mapa_riscos?processo_id=eq.${processoId}`, "DELETE")).status);
console.log("delete tr:", (await sb(`planejamento_tr?processo_id=eq.${processoId}`, "DELETE")).status);
console.log("delete etp:", (await sb(`planejamento_etp?processo_id=eq.${processoId}`, "DELETE")).status);
console.log("delete dfd:", (await sb(`planejamento_dfd?processo_id=eq.${processoId}`, "DELETE")).status);
console.log("delete processo:", (await sb(`planejamento_processos?id=eq.${processoId}`, "DELETE")).status);
