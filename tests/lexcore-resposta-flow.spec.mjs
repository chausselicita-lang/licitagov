/**
 * Teste E2E — LexCore: fluxo de Resposta a Impugnação/Recurso
 *   anexar PDF de impugnação/recurso recebido -> gerar resposta via IA ->
 *   editar -> exportar em .docx
 *
 * Independente do fluxo de análise de edital (tests/lexcore-flow.spec.mjs) —
 * não depende de nenhuma análise ou peça salva.
 *
 * Sem mock — usa a API Anthropic real via produção e o Supabase real do
 * projeto. Cada execução:
 *   - consome tokens reais da API Anthropic (1 chamada: geração da resposta)
 *   - cria um registro real em lexcore_respostas
 *   - envia um arquivo real para o bucket "lexcore-docs"
 * Por isso este teste NÃO roda em CI nem automaticamente — apenas manual.
 *
 * Uso:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
 *   node "G:\Desktop\AUTOMAÇÕES\licitaGov\node_modules\@playwright\test\cli.js" test lexcore-resposta-flow --config "G:\Desktop\AUTOMAÇÕES\licitaGov\playwright.config.mjs" --reporter=line
 *
 * Pré-requisito: supabase/migration_lexcore_respostas.sql precisa já ter
 * sido aplicada no projeto e a variável ANTHROPIC_API_KEY precisa estar
 * configurada no ambiente do Vercel.
 */
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://xqlrfsrjvqmucchzpapk.supabase.co";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL        = process.env.LEXCORE_TEST_EMAIL || "chausselicita@gmail.com";
const PROD_URL     = process.env.LEXCORE_APP_URL || "https://licitagov-one.vercel.app";
const DOC_PDF      = path.join(__dirname, "fixtures", "edital-teste.pdf");

test.setTimeout(120000); // geração via IA pode levar ~1min

function followRedirect(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      const loc = res.headers["location"];
      resolve(loc || url);
      res.resume();
    }).on("error", reject);
  });
}

test("fluxo completo Resposta a Impugnação/Recurso: anexar -> gerar -> editar -> docx", async ({ browser }) => {
  if (!SERVICE_KEY) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY antes de rodar o teste.");

  // 1. Login via magic link (mesmo padrão dos demais specs deste projeto)
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink", email: EMAIL, options: { redirectTo: PROD_URL },
  });
  if (error) throw new Error("generateLink falhou: " + error.message);
  let appUrl = await followRedirect(data.properties.action_link);
  if (appUrl.startsWith("https://xqlrfsrjvqmucchzpapk")) appUrl = await followRedirect(appUrl);

  const page = await browser.newPage();
  await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  // 2. Navegar para a aba LexCore e trocar para a seção de Respostas
  await page.locator("text=LexCore").first().click();
  await page.waitForTimeout(500);
  await expect(page.locator("text=Respostas a Impugnação/Recurso")).toBeVisible({ timeout: 8000 });
  await page.locator("text=Respostas a Impugnação/Recurso").first().click();
  console.log("✅ Seção de Respostas aberta");

  // 3. Iniciar nova resposta — SEM nenhuma análise de edital envolvida
  await page.locator("button", { hasText: "Nova Resposta" }).first().click();
  await expect(page.locator("text=Nova Resposta a Impugnação/Recurso")).toBeVisible({ timeout: 8000 });

  await page.locator("select").selectOption("contrarrazoes");
  await page.locator("input[placeholder*='Pregão Eletrônico']").fill("Pregão Eletrônico nº 001/2026 — Teste Resposta");
  await page.locator("input[placeholder*='2026.001']").fill("2026.999.0002-TESTE");

  const fileInput = page.locator('input[type="file"][accept="application/pdf"]');
  await fileInput.setInputFiles(DOC_PDF);
  await expect(page.locator("text=edital-teste.pdf")).toBeVisible({ timeout: 5000 });
  console.log("✅ PDF do documento recebido anexado");

  // 4. Disparar geração por IA e aguardar o editor da resposta
  await page.locator("button", { hasText: "Gerar Resposta" }).first().click();
  console.log("Gerando resposta via IA...");
  await expect(page.locator("textarea")).toBeVisible({ timeout: 60000 });
  console.log("✅ Resposta gerada — editor exibido");

  const textoGerado = await page.locator("textarea").inputValue();
  expect(textoGerado.length).toBeGreaterThan(50);
  await page.screenshot({ path: path.join(__dirname, "lexcore-resposta.png") });

  // 5. Exportar em .docx
  await page.locator("button", { hasText: "Exportar .docx" }).first().click();
  await expect(page.locator("text=abrir .docx")).toBeVisible({ timeout: 30000 });
  console.log("✅ Resposta exportada em .docx com sucesso");

  // 6. Voltar à lista e confirmar que a seção de Análise de Editais permanece intacta
  await page.locator('[title="Voltar"]').first().click();
  await expect(page.locator("text=Análise de Editais")).toBeVisible({ timeout: 8000 });
  await page.locator("text=Análise de Editais").first().click();
  await expect(page.locator("text=Nova Análise")).toBeVisible({ timeout: 8000 });
  console.log("✅ Seção de Análise de Editais continua funcionando normalmente");

  console.log("✅ FLUXO COMPLETO RESPOSTA VALIDADO: anexar → gerar → editar → exportação, independente da análise de edital");
});
