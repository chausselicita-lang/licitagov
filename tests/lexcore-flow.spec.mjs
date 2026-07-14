/**
 * Teste E2E — LexCore: fluxo completo
 *   upload de edital -> análise IA -> seleção de pontos críticos ->
 *   geração de peça -> exportação em .docx
 *
 * Sem mock — usa a API Anthropic real via produção (o app chama /api/claude
 * diretamente do navegador) e o Supabase real do projeto. Cada execução:
 *   - consome tokens reais da API Anthropic (2 chamadas: análise + geração)
 *   - cria registros reais em lexcore_analises / lexcore_pontos_criticos / lexcore_pecas
 *   - envia um arquivo real para o bucket "lexcore-docs"
 * Por isso este teste NÃO roda em CI nem automaticamente — apenas manual.
 *
 * Uso:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
 *   node "G:\Desktop\AUTOMAÇÕES\licitaGov\node_modules\@playwright\test\cli.js" test lexcore-flow --config "G:\Desktop\AUTOMAÇÕES\licitaGov\playwright.config.mjs" --reporter=line
 *
 * Pré-requisito: a migration supabase/migration_lexcore.sql precisa já ter
 * sido aplicada no projeto (ver instruções no próprio arquivo) e a variável
 * ANTHROPIC_API_KEY precisa estar configurada no ambiente do Vercel.
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
const EDITAL_PDF   = path.join(__dirname, "fixtures", "edital-teste.pdf");

test.setTimeout(180000); // análise + geração de peça via IA podem levar ~1min

function followRedirect(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      const loc = res.headers["location"];
      resolve(loc || url);
      res.resume();
    }).on("error", reject);
  });
}

test("fluxo completo LexCore: upload -> análise -> seleção -> peça -> docx", async ({ browser }) => {
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

  // 2. Navegar para a aba LexCore
  await page.locator("text=LexCore").first().click();
  await page.waitForTimeout(500);
  await expect(page.locator("text=Nova Análise")).toBeVisible({ timeout: 8000 });
  console.log("✅ Aba LexCore carregada");

  // 3. Iniciar nova análise
  await page.locator("button", { hasText: "Nova Análise" }).first().click();
  await expect(page.locator("text=Nova Análise de Edital")).toBeVisible({ timeout: 8000 });

  await page.locator("input[placeholder*='Pregão Eletrônico']").fill("Pregão Eletrônico nº 001/2026 — Teste LexCore");
  await page.locator("input[placeholder*='2026.001']").fill("2026.999.0001-TESTE");

  const fileInput = page.locator('input[type="file"][accept="application/pdf"]');
  await fileInput.setInputFiles(EDITAL_PDF);
  await expect(page.locator("text=edital-teste.pdf")).toBeVisible({ timeout: 5000 });
  console.log("✅ PDF do edital de teste anexado");

  // 4. Disparar análise por IA e aguardar o dashboard de pontos críticos
  await page.locator("button", { hasText: "Analisar Edital" }).first().click();
  console.log("Analisando edital via IA...");
  await expect(page.locator("text=Pontos Críticos")).toBeVisible({ timeout: 90000 });
  console.log("✅ Análise concluída — dashboard de pontos críticos exibido");
  await page.screenshot({ path: path.join(__dirname, "lexcore-analise.png") });

  // 5. Selecionar ao menos um ponto crítico (checkbox) e ir para o card de Peças Jurídicas
  const checkboxes = page.locator('input[type="checkbox"]');
  const total = await checkboxes.count();
  expect(total).toBeGreaterThan(0);
  await checkboxes.first().check();
  console.log(`✅ ${total} ponto(s) crítico(s) identificado(s) — 1 selecionado`);

  // A geração de peça foi desmembrada da tela de Análise (ver src/App.jsx,
  // componente LexcoreAnalise) — agora só existe o botão de navegação
  // "Gerar Peça Jurídica", que leva para o card "LexCore Peças Jurídicas"
  // (componente NovaPecaAPartirDeAnalise) já com esta análise pré-selecionada.
  await page.locator("button", { hasText: "Gerar Peça Jurídica" }).first().click();
  await expect(page.locator("text=Nova Peça a partir de Análise")).toBeVisible({ timeout: 8000 });
  console.log("✅ Navegou para o card de Peças Jurídicas com a análise pré-selecionada");

  await page.locator("button", { hasText: "Gerar Peça" }).first().click();
  console.log("Gerando peça jurídica via IA...");
  await expect(page.locator("textarea")).toBeVisible({ timeout: 60000 });
  console.log("✅ Peça gerada — editor exibido");

  const textoGerado = await page.locator("textarea").inputValue();
  expect(textoGerado.length).toBeGreaterThan(50);
  await page.screenshot({ path: path.join(__dirname, "lexcore-peca.png") });

  // 6. Exportar em .docx
  await page.locator("button", { hasText: "Exportar .docx" }).first().click();
  await expect(page.locator("text=abrir .docx")).toBeVisible({ timeout: 30000 });
  console.log("✅ Peça exportada em .docx com sucesso");

  console.log("✅ FLUXO COMPLETO LEXCORE VALIDADO: upload → análise → seleção → geração → exportação");
});
