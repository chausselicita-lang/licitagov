// Script ad-hoc: teste end-to-end da cascata completa (intake -> DFD -> ETP
// -> TR -> Mapa de Riscos -> Verificador de Coerência -> exportação .docx)
// usando uma SESSÃO REAL de usuário autenticado (não service role) em cada
// escrita de planejamento_*, pra provar que a RLS permite gravações
// legítimas do próprio tenant (só bloqueia as de outro tenant, já testado
// em test-planejamento-rls.mjs). Cria tudo temporário e limpa no final.
// Não faz parte do build/produção.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import {
  buildDfdSystem, buildDfdUserText, DFD_MAX_TOKENS,
  buildEtpSystem, buildEtpUserText, ETP_MAX_TOKENS, ETP_PERGUNTAS_COMPLEMENTARES,
  buildTrSystem, buildTrUserText, TR_MAX_TOKENS,
  buildMapaRiscosSystem, buildMapaRiscosUserText, parseRiscosJSON, montarConteudoMapaRiscos, MAPA_RISCOS_MAX_TOKENS,
  buildCoerenciaSystem, buildCoerenciaUserText, parseContradicoesJSON, statusGeralCoerencia, COERENCIA_MAX_TOKENS,
} from "../src/lib/planejamentoPrompts.js";
import { buildPlanejamentoDocx, nomeArquivoPlanejamento } from "../src/lib/planejamentoDocx.js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SUPABASE_URL = "https://xqlrfsrjvqmucchzpapk.supabase.co";
const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const BUCKET = "planejamento-docs";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

let ok = 0, fail = 0;
function assert(desc, cond) {
  if (cond) { ok++; console.log(`  OK   - ${desc}`); }
  else { fail++; console.log(`  FAIL - ${desc}`); }
}

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

let tenant, user, session, processoId;
const storagePaths = [];

async function limpar() {
  console.log("\n>>> Limpeza");
  if (processoId) {
    await admin.from("planejamento_coerencia_checks").delete().eq("processo_id", processoId);
    await admin.from("planejamento_mapa_riscos").delete().eq("processo_id", processoId);
    await admin.from("planejamento_tr").delete().eq("processo_id", processoId);
    await admin.from("planejamento_etp").delete().eq("processo_id", processoId);
    await admin.from("planejamento_dfd").delete().eq("processo_id", processoId);
    await admin.from("planejamento_processos").delete().eq("id", processoId);
  }
  for (const path of storagePaths) {
    await admin.storage.from(BUCKET).remove([path]);
  }
  if (user) {
    await admin.from("user_profiles").delete().eq("id", user.id);
    await admin.auth.admin.deleteUser(user.id);
  }
  if (tenant) await admin.from("tenants").delete().eq("id", tenant.id);
  console.log("processo, storage, user e tenant de teste removidos");
}

try {
  console.log(">>> Setup: tenant + usuário + sessão real");
  const { data: t } = await admin.from("tenants").insert({ nome: "TESTE E2E TENANT", municipio: "Teste E2E", ativo: true }).select().single();
  tenant = t;
  const stamp = Date.now();
  const email = `teste-e2e-${stamp}@licitagov.test`;
  const senha = "TesteE2E!2026x";
  const { data: authUser } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
  user = authUser.user;
  await admin.from("user_profiles").insert({ id: user.id, email, nome: "Teste E2E", role: "cliente", prefeitura_nome: "Teste E2E", prefeitura_municipio: "Teste E2E", tenant_id: tenant.id, ativo: true });

  const loginClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: sess, error: loginErr } = await loginClient.auth.signInWithPassword({ email, password: senha });
  if (loginErr) throw loginErr;
  session = sess.session;
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
  console.log("tenant/usuário/sessão OK — tenant_id:", tenant.id);

  const intake = {
    numeroProcesso: "E2E-TESTE-001",
    objeto: "Contratação de serviço de manutenção predial para a Secretaria de Educação",
    justificativaResumida: "Os prédios escolares precisam de manutenção preventiva regular para garantir segurança dos alunos.",
    quantidadeEstimada: "12 meses de serviço continuado",
    valorEstimado: 96000.00,
    areaRequisitante: "Secretaria Municipal de Educação",
    tipoContratacao: "servicos_continuados",
  };
  const agente = { nome: "Teste E2E", email, prefeitura: "Teste E2E", municipio: "Teste E2E" };

  console.log("\n>>> 1. INTAKE — cria processo via sessão real do usuário");
  const { data: proc, error: procErr } = await asUser.from("planejamento_processos").insert({
    numero_processo: intake.numeroProcesso, objeto: intake.objeto, justificativa_resumida: intake.justificativaResumida,
    quantidade_estimada: intake.quantidadeEstimada, valor_estimado: intake.valorEstimado,
    area_requisitante: intake.areaRequisitante, tipo_contratacao: intake.tipoContratacao,
  }).select().single();
  assert("processo criado via sessão real (RLS permitiu escrita no próprio tenant)", !procErr && !!proc);
  processoId = proc.id;
  assert("tenant_id do processo bate com o tenant do usuário", proc.tenant_id === tenant.id);

  console.log("\n>>> 2. Gera e salva DFD via sessão real");
  const dfdConteudo = await chamarClaude(buildDfdSystem(), buildDfdUserText({ intake, agente }), DFD_MAX_TOKENS);
  const { data: dfd, error: dfdErr } = await asUser.from("planejamento_dfd").insert({ processo_id: processoId, conteudo_gerado: dfdConteudo }).select().single();
  assert("DFD salvo via sessão real", !dfdErr && !!dfd && dfd.tenant_id === tenant.id);
  await asUser.from("planejamento_processos").update({ status: "dfd_gerado" }).eq("id", processoId);

  console.log("\n>>> 3. Gera e salva ETP via sessão real");
  const respostas = { alternativa_mercado: "", contratacoes_correlatas: "" }; // pulando ambas -> resposta padrão
  const etpConteudo = await chamarClaude(buildEtpSystem(), buildEtpUserText({ intake, dfdConteudo, respostas }), ETP_MAX_TOKENS);
  const perguntasComplementares = ETP_PERGUNTAS_COMPLEMENTARES.map(p => ({ chave: p.chave, pergunta: p.pergunta, resposta: null }));
  const { data: etp, error: etpErr } = await asUser.from("planejamento_etp").insert({ processo_id: processoId, perguntas_complementares: perguntasComplementares, conteudo_gerado: etpConteudo }).select().single();
  assert("ETP salvo via sessão real (cenário: as 2 perguntas puladas)", !etpErr && !!etp);
  await asUser.from("planejamento_processos").update({ status: "etp_gerado" }).eq("id", processoId);

  console.log("\n>>> 4. Gera e salva TR via sessão real");
  const trConteudo = await chamarClaude(buildTrSystem(), buildTrUserText({ intake, dfdConteudo, etpConteudo }), TR_MAX_TOKENS);
  const { data: tr, error: trErr } = await asUser.from("planejamento_tr").insert({ processo_id: processoId, conteudo_gerado: trConteudo }).select().single();
  assert("TR salvo via sessão real", !trErr && !!tr);
  await asUser.from("planejamento_processos").update({ status: "tr_gerado" }).eq("id", processoId);

  console.log("\n>>> 5. Gera e salva Mapa de Riscos via sessão real");
  const riscosTexto = await chamarClaude(buildMapaRiscosSystem(), buildMapaRiscosUserText({ intake, trConteudo }), MAPA_RISCOS_MAX_TOKENS);
  const riscos = parseRiscosJSON(riscosTexto);
  const mapaConteudo = montarConteudoMapaRiscos({ intake, agente, riscos });
  const { data: mapa, error: mapaErr } = await asUser.from("planejamento_mapa_riscos").insert({ processo_id: processoId, riscos, conteudo_gerado: mapaConteudo }).select().single();
  assert("Mapa de Riscos salvo via sessão real", !mapaErr && !!mapa && riscos.length > 0);
  await asUser.from("planejamento_processos").update({ status: "completo" }).eq("id", processoId);

  console.log("\n>>> 6. Verificador de Coerência via sessão real");
  const coerenciaResp = await chamarClaude(buildCoerenciaSystem(), buildCoerenciaUserText({ dfdConteudo, etpConteudo, trConteudo, mapaRiscosConteudo: mapaConteudo }), COERENCIA_MAX_TOKENS);
  const contradicoes = parseContradicoesJSON(coerenciaResp);
  const statusGeral = statusGeralCoerencia(contradicoes);
  const { data: check, error: checkErr } = await asUser.from("planejamento_coerencia_checks").insert({ processo_id: processoId, contradicoes, status_geral: statusGeral }).select().single();
  assert("check de coerência salvo via sessão real", !checkErr && !!check);
  console.log(`     status geral: ${statusGeral} (${contradicoes.length} contradição(ões) — cascata gerada de forma consistente, então esperado baixo/zero)`);

  console.log("\n>>> 7. Confere status final do processo");
  const { data: procFinal } = await asUser.from("planejamento_processos").select("status").eq("id", processoId).single();
  assert("status final do processo é 'completo'", procFinal.status === "completo");

  console.log("\n>>> 8. Exportação .docx (upload via service role, como o endpoint Vercel faz)");
  const buf = await buildPlanejamentoDocx({ tipoPeca: "tr", conteudoGerado: trConteudo, processoObjeto: intake.objeto, numeroProcesso: intake.numeroProcesso });
  const nomeArquivo = nomeArquivoPlanejamento({ tipoPeca: "tr", numeroProcesso: intake.numeroProcesso });
  const path = `pecas/tr/${tr.id}/${nomeArquivo}`;
  storagePaths.push(path);
  const upload = await admin.storage.from(BUCKET).upload(path, buf, { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", upsert: true });
  assert("upload do .docx no storage funcionou", !upload.error);
  const docxUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  await admin.from("planejamento_tr").update({ arquivo_docx_url: docxUrl, status: "finalizado" }).eq("id", tr.id);
  const pub = await fetch(docxUrl);
  assert("arquivo .docx acessível publicamente (200)", pub.status === 200);

  console.log(`\n>>> RESULTADO: ${ok} passaram, ${fail} falharam`);
} catch (err) {
  console.error("ERRO INESPERADO:", err);
  fail++;
} finally {
  await limpar();
  console.log(fail === 0 ? "\n✅ END-TO-END COMPLETO PASSOU" : `\n❌ ${fail} ETAPA(S) FALHARAM`);
  process.exit(fail === 0 ? 0 : 1);
}
