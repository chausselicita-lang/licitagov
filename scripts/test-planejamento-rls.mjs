// Script ad-hoc: valida RLS entre tenants nas 6 tabelas novas de
// planejamento_*, usando sessões reais (não service role) de dois usuários
// de tenants diferentes + um super_admin. Cria tudo temporário e limpa no
// final. Não faz parte do build/produção.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SUPABASE_URL = "https://xqlrfsrjvqmucchzpapk.supabase.co";
const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

let ok = 0, fail = 0;
function assert(desc, cond) {
  if (cond) { ok++; console.log(`  OK   - ${desc}`); }
  else { fail++; console.log(`  FAIL - ${desc}`); }
}

const TABELAS = ["planejamento_dfd", "planejamento_etp", "planejamento_tr", "planejamento_mapa_riscos", "planejamento_coerencia_checks"];

async function criarSessao(email, password) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
  return asUser;
}

const recursos = { tenants: [], users: [], processos: [] };

async function limpar() {
  console.log("\n>>> Limpeza");
  for (const p of recursos.processos) {
    await admin.from("planejamento_coerencia_checks").delete().eq("processo_id", p);
    await admin.from("planejamento_mapa_riscos").delete().eq("processo_id", p);
    await admin.from("planejamento_tr").delete().eq("processo_id", p);
    await admin.from("planejamento_etp").delete().eq("processo_id", p);
    await admin.from("planejamento_dfd").delete().eq("processo_id", p);
    await admin.from("planejamento_processos").delete().eq("id", p);
  }
  for (const u of recursos.users) {
    await admin.from("user_profiles").delete().eq("id", u);
    await admin.auth.admin.deleteUser(u);
  }
  for (const t of recursos.tenants) {
    await admin.from("tenants").delete().eq("id", t);
  }
  console.log(`processos=${recursos.processos.length} users=${recursos.users.length} tenants=${recursos.tenants.length} removidos`);
}

try {
  console.log(">>> 1. cria 2 tenants de teste");
  const { data: tenantA } = await admin.from("tenants").insert({ nome: "TESTE RLS TENANT A", municipio: "Teste A", ativo: true }).select().single();
  const { data: tenantB } = await admin.from("tenants").insert({ nome: "TESTE RLS TENANT B", municipio: "Teste B", ativo: true }).select().single();
  recursos.tenants.push(tenantA.id, tenantB.id);
  console.log("tenantA=", tenantA.id, "tenantB=", tenantB.id);

  console.log(">>> 2. cria 3 usuários (cliente A, cliente B, super_admin) via admin API");
  const senha = "TesteRLS!2026x";
  const stamp = Date.now();
  const emailA = `teste-rls-a-${stamp}@licitagov.test`;
  const emailB = `teste-rls-b-${stamp}@licitagov.test`;
  const emailSuper = `teste-rls-super-${stamp}@licitagov.test`;

  const { data: authA } = await admin.auth.admin.createUser({ email: emailA, password: senha, email_confirm: true });
  const { data: authB } = await admin.auth.admin.createUser({ email: emailB, password: senha, email_confirm: true });
  const { data: authSuper } = await admin.auth.admin.createUser({ email: emailSuper, password: senha, email_confirm: true });
  recursos.users.push(authA.user.id, authB.user.id, authSuper.user.id);

  await admin.from("user_profiles").insert({ id: authA.user.id, email: emailA, nome: "Teste RLS A", role: "cliente", prefeitura_nome: "Teste A", prefeitura_municipio: "Teste A", tenant_id: tenantA.id, ativo: true });
  await admin.from("user_profiles").insert({ id: authB.user.id, email: emailB, nome: "Teste RLS B", role: "cliente", prefeitura_nome: "Teste B", prefeitura_municipio: "Teste B", tenant_id: tenantB.id, ativo: true });
  await admin.from("user_profiles").insert({ id: authSuper.user.id, email: emailSuper, nome: "Teste RLS Super", role: "super_admin", tenant_id: tenantA.id, ativo: true });
  console.log("perfis criados");

  console.log(">>> 3. loga como os 3 (sessão real, JWT de verdade)");
  const asA = await criarSessao(emailA, senha);
  const asB = await criarSessao(emailB, senha);
  const asSuper = await criarSessao(emailSuper, senha);
  console.log("sessões OK");

  console.log(">>> 4. admin cria 1 processo pra cada tenant (dados base do teste)");
  const { data: procA } = await admin.from("planejamento_processos").insert({
    tenant_id: tenantA.id, objeto: "Processo do Tenant A", justificativa_resumida: "teste", area_requisitante: "teste", tipo_contratacao: "bens",
  }).select().single();
  const { data: procB } = await admin.from("planejamento_processos").insert({
    tenant_id: tenantB.id, objeto: "Processo do Tenant B", justificativa_resumida: "teste", area_requisitante: "teste", tipo_contratacao: "bens",
  }).select().single();
  recursos.processos.push(procA.id, procB.id);
  console.log("procA=", procA.id, "procB=", procB.id);

  console.log("\n>>> TESTE 1 — isolamento de leitura em planejamento_processos");
  const { data: leituraA } = await asA.from("planejamento_processos").select("id,objeto");
  assert("usuário A vê o processo do tenant A", leituraA.some(p => p.id === procA.id));
  assert("usuário A NÃO vê o processo do tenant B", !leituraA.some(p => p.id === procB.id));

  const { data: leituraB } = await asB.from("planejamento_processos").select("id,objeto");
  assert("usuário B vê o processo do tenant B", leituraB.some(p => p.id === procB.id));
  assert("usuário B NÃO vê o processo do tenant A", !leituraB.some(p => p.id === procA.id));

  console.log("\n>>> TESTE 2 — leitura direta por id de linha de outro tenant");
  const { data: diretaAvB } = await asA.from("planejamento_processos").select("id").eq("id", procB.id);
  assert("usuário A não consegue ler o processo B mesmo pedindo o id direto", (diretaAvB || []).length === 0);

  console.log("\n>>> TESTE 3 — tentativa de UPDATE em linha de outro tenant");
  const { data: updResult } = await asA.from("planejamento_processos").update({ objeto: "HACKED" }).eq("id", procB.id).select();
  assert("UPDATE do usuário A na linha do tenant B não afeta nenhuma linha", (updResult || []).length === 0);
  const { data: procBConfere } = await admin.from("planejamento_processos").select("objeto").eq("id", procB.id).single();
  assert("objeto do processo B continua intacto (não foi hackeado)", procBConfere.objeto === "Processo do Tenant B");

  console.log("\n>>> TESTE 4 — INSERT sem tenant_id (trigger deve preencher sozinho)");
  const { data: novoPorA, error: erroNovoPorA } = await asA.from("planejamento_processos").insert({
    objeto: "Processo criado pelo usuário A via sessão real", justificativa_resumida: "teste", area_requisitante: "teste", tipo_contratacao: "bens",
  }).select().single();
  assert("INSERT do usuário A funcionou sem passar tenant_id", !erroNovoPorA && !!novoPorA);
  if (novoPorA) { recursos.processos.push(novoPorA.id); assert("trigger preencheu tenant_id = tenant A automaticamente", novoPorA.tenant_id === tenantA.id); }

  console.log("\n>>> TESTE 5 — tentativa de INSERT forjando tenant_id de outro tenant");
  const { error: erroForjado } = await asA.from("planejamento_processos").insert({
    tenant_id: tenantB.id, objeto: "Tentativa de INSERT forjado no tenant B", justificativa_resumida: "teste", area_requisitante: "teste", tipo_contratacao: "bens",
  }).select().single();
  assert("INSERT forjando tenant_id de outro tenant é REJEITADO pela policy (with check)", !!erroForjado);

  console.log("\n>>> TESTE 6 — super_admin enxerga os dois tenants");
  const { data: leituraSuper } = await asSuper.from("planejamento_processos").select("id");
  assert("super_admin vê o processo do tenant A", leituraSuper.some(p => p.id === procA.id));
  assert("super_admin vê o processo do tenant B", leituraSuper.some(p => p.id === procB.id));

  console.log("\n>>> TESTE 7 — isolamento nas 5 tabelas-filhas (dfd/etp/tr/mapa_riscos/coerencia_checks)");
  for (const tabela of TABELAS) {
    const payloadBase = tabela === "planejamento_coerencia_checks"
      ? { contradicoes: [], status_geral: "coerente" }
      : tabela === "planejamento_mapa_riscos"
        ? { riscos: [], conteudo_gerado: `teste ${tabela}` }
        : tabela === "planejamento_etp"
          ? { perguntas_complementares: [], conteudo_gerado: `teste ${tabela}` }
          : { conteudo_gerado: `teste ${tabela}` };

    const { data: linhaA } = await admin.from(tabela).insert({ processo_id: procA.id, tenant_id: tenantA.id, ...payloadBase }).select().single();
    const { data: vistoPorB } = await asB.from(tabela).select("id").eq("id", linhaA.id);
    const { data: vistoPorA } = await asA.from(tabela).select("id").eq("id", linhaA.id);
    assert(`${tabela}: usuário B NÃO vê a linha do tenant A`, (vistoPorB || []).length === 0);
    assert(`${tabela}: usuário A vê sua própria linha`, (vistoPorA || []).length === 1);
  }

  console.log(`\n>>> RESULTADO: ${ok} passaram, ${fail} falharam`);
} catch (err) {
  console.error("ERRO INESPERADO:", err);
  fail++;
} finally {
  await limpar();
  console.log(fail === 0 ? "\n✅ TODOS OS TESTES DE RLS PASSARAM" : `\n❌ ${fail} TESTE(S) FALHARAM`);
  process.exit(fail === 0 ? 0 : 1);
}
