/**
 * Teste E2E — fluxo de recuperação de senha (PASSWORD_RECOVERY)
 *
 * Pré-requisito: SUPABASE_SERVICE_ROLE_KEY e RECOVERY_EMAIL definidos.
 *   $env:SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
 *   $env:RECOVERY_EMAIL="chausselicita@gmail.com"
 *   node "G:\Desktop\licitaGov\node_modules\@playwright\test\cli.js" test tests/recovery-flow.spec.mjs
 */

import { test, expect, chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xqlrfsrjvqmucchzpapk.supabase.co";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL        = process.env.RECOVERY_EMAIL || "chausselicita@gmail.com";
const PROD_URL     = "https://licitagov-one.vercel.app";

test.use({ headless: false }); // visível para inspeção

test("recovery link abre tela Definir nova senha", async () => {
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
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(actionLink, { waitUntil: "networkidle", timeout: 30000 });

  // 3. O link redireciona para o PROD_URL com o hash de recuperação.
  //    Aguardar o app React montar a tela correta.
  await page.waitForTimeout(3000); // aguarda hidratação React

  // 4. Verificar que a tela "Definir nova senha" aparece
  const heading = page.locator("text=Definir nova senha");
  await expect(heading).toBeVisible({ timeout: 10000 });

  console.log("✅ Tela 'Definir nova senha' confirmada na produção.");

  // 5. Screenshot como evidência
  await page.screenshot({ path: "tests/recovery-screenshot.png", fullPage: true });

  await browser.close();
});
