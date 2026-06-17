/**
 * Teste E2E — fluxo de recuperação de senha (PASSWORD_RECOVERY)
 *
 * Pré-requisito: SUPABASE_SERVICE_ROLE_KEY e RECOVERY_EMAIL definidos.
 *   $env:SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
 *   $env:RECOVERY_EMAIL="chausselicita@gmail.com"
 *   node "G:\Desktop\licitaGov\node_modules\@playwright\test\cli.js" test tests/recovery-flow.spec.mjs
 */

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xqlrfsrjvqmucchzpapk.supabase.co";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL        = process.env.RECOVERY_EMAIL || "chausselicita@gmail.com";
const PROD_URL     = "https://licitagov-one.vercel.app";

test("recovery link abre tela Definir nova senha", async ({ browser }) => {
  if (!SERVICE_KEY) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY antes de rodar o teste.");

  // 1. Gerar link real via Supabase Admin (service role)
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: EMAIL,
    options: { redirectTo: PROD_URL },
  });

  if (error) throw new Error("Supabase Admin generateLink falhou: " + error.message);

  // Supabase retorna o link como data.properties.action_link
  const actionLink = data?.properties?.action_link;
  if (!actionLink) throw new Error("Link de recuperação não retornado: " + JSON.stringify(data));

  console.log("Link gerado:", actionLink);

  // 2. Navegar para o link no site de produção
  const page = await browser.newPage();

  // Capturar todos os logs do browser
  const browserLogs = [];
  page.on("console", msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    browserLogs.push(text);
    console.log("Browser:", text);
  });

  await page.goto(actionLink, { waitUntil: "networkidle", timeout: 30000 });

  // 3. O link redireciona para o PROD_URL com o hash de recuperação.
  //    Aguardar o app React montar + processar o hash
  await page.waitForTimeout(5000);

  const finalUrl = page.url();
  console.log("URL final:", finalUrl);

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log("Texto na página (primeiros 300 chars):", bodyText.slice(0, 300));
  console.log("Logs do browser:", browserLogs.join(" | "));

  // Screenshot diagnóstico
  await page.screenshot({ path: "G:\\Desktop\\licitaGov\\tests\\recovery-screenshot.png", fullPage: true });

  // 4. Verificar que a tela "Definir nova senha" aparece
  const heading = page.locator("text=Definir nova senha");
  await expect(heading).toBeVisible({ timeout: 10000 });

  console.log("✅ Tela 'Definir nova senha' confirmada na produção.");

});
