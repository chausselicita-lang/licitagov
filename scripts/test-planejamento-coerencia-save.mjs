// Script ad-hoc: grava um registro de planejamento_coerencia_checks via
// service role pra confirmar que o schema aguenta o jsonb de contradições.
// Não faz parte do build/produção.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
const URL_BASE = "https://xqlrfsrjvqmucchzpapk.supabase.co";
const TENANT_ID = "80ac4d6a-3e40-4cad-9077-a8d2ce510323";

async function sb(path, method, body) {
  const resp = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await resp.json().catch(() => null);
  return { status: resp.status, json };
}

console.log(">>> 1. cria processo");
const proc = await sb("planejamento_processos", "POST", {
  tenant_id: TENANT_ID, numero_processo: "TESTE-COERENCIA", objeto: "Objeto de teste",
  justificativa_resumida: "Teste", area_requisitante: "Teste", tipo_contratacao: "bens",
});
const processoId = proc.json[0].id;
console.log("processo status=", proc.status);

console.log(">>> 2. grava check de coerência com contradições");
const contradicoes = [
  { campo: "valor_estimado", peca_a: "tr", peca_b: "dfd", valor_a: "R$ 142.000,00", valor_b: "R$ 187.500,00", severidade: "alta", descricao: "Valor divergente entre TR e DFD." },
];
const check1 = await sb("planejamento_coerencia_checks", "POST", {
  processo_id: processoId, tenant_id: TENANT_ID, contradicoes, status_geral: "divergencias_encontradas",
});
console.log("check1 status=", check1.status);

console.log(">>> 3. grava segundo check, sem contradições (histórico de reverificações)");
const check2 = await sb("planejamento_coerencia_checks", "POST", {
  processo_id: processoId, tenant_id: TENANT_ID, contradicoes: [], status_geral: "coerente",
});
console.log("check2 status=", check2.status);

console.log(">>> 4. lista os checks do processo (mais recente primeiro)");
const lista = await sb(`planejamento_coerencia_checks?processo_id=eq.${processoId}&select=status_geral,contradicoes,created_at&order=created_at.desc`, "GET");
console.log("lista status=", lista.status);
console.log(JSON.stringify(lista.json, null, 2));

console.log(">>> 5. limpeza");
console.log("delete checks:", (await sb(`planejamento_coerencia_checks?processo_id=eq.${processoId}`, "DELETE")).status);
console.log("delete processo:", (await sb(`planejamento_processos?id=eq.${processoId}`, "DELETE")).status);
