// Script ad-hoc: gera um DFD de teste e salva em planejamento_dfd via
// service role, pra validar que o schema aguenta o conteúdo real gerado
// pela IA. Usa o processo de teste já criado manualmente. Não faz parte
// do build/produção — remover a linha de teste do banco depois de rodar.
import { buildDfdSystem, buildDfdUserText } from "../src/lib/planejamentoPrompts.js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
const URL_BASE = "https://xqlrfsrjvqmucchzpapk.supabase.co";
const PROC_ID = process.argv[2];
if (!PROC_ID) { console.error("uso: node test-planejamento-dfd-save.mjs <processo_id>"); process.exit(1); }

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

const genResp = await fetch("https://licitagov-one.vercel.app/api/claude", {
  method: "POST",
  headers: { "content-type": "application/json", "anthropic-version": "2023-06-01" },
  body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4096, system, messages: [{ role: "user", content: userText }] }),
});
const genJson = await genResp.json();
if (!genResp.ok) { console.error("ERRO GERACAO", genResp.status, genJson); process.exit(1); }
const conteudoGerado = genJson.content?.[0]?.text || "";
console.log("DFD gerado, chars=", conteudoGerado.length);

const insertResp = await fetch(`${URL_BASE}/rest/v1/planejamento_dfd`, {
  method: "POST",
  headers: {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/json",
    prefer: "return=representation",
  },
  body: JSON.stringify({ processo_id: PROC_ID, tenant_id: "80ac4d6a-3e40-4cad-9077-a8d2ce510323", conteudo_gerado: conteudoGerado }),
});
const insertJson = await insertResp.json();
console.log("INSERT STATUS", insertResp.status);
console.log(JSON.stringify(insertJson, null, 2).slice(0, 800));

const updResp = await fetch(`${URL_BASE}/rest/v1/planejamento_processos?id=eq.${PROC_ID}`, {
  method: "PATCH",
  headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", prefer: "return=representation" },
  body: JSON.stringify({ status: "dfd_gerado" }),
});
console.log("UPDATE STATUS PROCESSO", updResp.status);
