// Script ad-hoc: simula o que api/planejamento-exportar.js faz (upload pro
// bucket planejamento-docs + update da linha), usando service role direto,
// pra validar essa parte sem precisar deployar o endpoint Vercel ainda.
// Não faz parte do build/produção.
import { readFileSync } from "node:fs";
import { buildPlanejamentoDocx, nomeArquivoPlanejamento } from "../src/lib/planejamentoDocx.js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
const URL_BASE = "https://xqlrfsrjvqmucchzpapk.supabase.co";
const TENANT_ID = "80ac4d6a-3e40-4cad-9077-a8d2ce510323";
const BUCKET = "planejamento-docs";

async function sb(path, method, body) {
  const resp = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await resp.json().catch(() => null);
  return { status: resp.status, json };
}

console.log(">>> 1. cria processo + dfd de teste");
const proc = await sb("planejamento_processos", "POST", {
  tenant_id: TENANT_ID, numero_processo: "TESTE-DOCX", objeto: "Objeto de teste pra exportação docx",
  justificativa_resumida: "Teste", area_requisitante: "Teste", tipo_contratacao: "bens",
});
const processoId = proc.json[0].id;
const dfd = await sb("planejamento_dfd", "POST", { processo_id: processoId, tenant_id: TENANT_ID, conteudo_gerado: "TÍTULO DE TESTE\n\nParágrafo de teste do DFD.\n\nOUTRA SEÇÃO\n\nMais um parágrafo." });
const dfdId = dfd.json[0].id;
console.log("processo/dfd criados, status=", proc.status, dfd.status);

console.log(">>> 2. builda docx e faz upload direto no storage (mesma lógica do endpoint)");
const buf = await buildPlanejamentoDocx({ tipoPeca: "dfd", conteudoGerado: dfd.json[0].conteudo_gerado, processoObjeto: "Objeto de teste pra exportação docx", numeroProcesso: "TESTE-DOCX" });
const nomeArquivo = nomeArquivoPlanejamento({ tipoPeca: "dfd", numeroProcesso: "TESTE-DOCX" });
const path = `pecas/dfd/${dfdId}/${nomeArquivo}`;

const uploadResp = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path}`, {
  method: "POST",
  headers: {
    apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "x-upsert": "true",
  },
  body: buf,
});
console.log("upload status=", uploadResp.status, await uploadResp.text());

const docxUrl = `${URL_BASE}/storage/v1/object/public/${BUCKET}/${path}`;
console.log(">>> 3. atualiza linha do dfd com a url");
const upd = await sb(`planejamento_dfd?id=eq.${dfdId}`, "PATCH", { arquivo_docx_url: docxUrl, status: "finalizado" });
console.log("update status=", upd.status);

console.log(">>> 4. confere se o arquivo está acessível publicamente");
const check = await fetch(docxUrl);
console.log("GET público status=", check.status, "content-type=", check.headers.get("content-type"), "content-length=", check.headers.get("content-length"));

console.log(">>> 5. limpeza (linha + arquivo no storage)");
console.log("delete dfd:", (await sb(`planejamento_dfd?id=eq.${dfdId}`, "DELETE")).status);
console.log("delete processo:", (await sb(`planejamento_processos?id=eq.${processoId}`, "DELETE")).status);
const delStorage = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path}`, {
  method: "DELETE",
  headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
});
console.log("delete storage object status=", delStorage.status);
