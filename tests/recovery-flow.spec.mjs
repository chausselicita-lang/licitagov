/**
 * Teste E2E — fluxo de recuperação de senha (PASSWORD_RECOVERY)
 *
 * Uso:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
 *   $env:RECOVERY_EMAIL="chausselicita@gmail.com"
 *   node "G:\Desktop\licitaGov\node_modules\@playwright\test\cli.js" test --config "G:\Desktop\licitaGov\playwright.config.mjs" --reporter=line
 */

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import https from "https";

const SUPABASE_URL = "https://xqlrfsrjvqmucchzpapk.supabase.co";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL        = process.env.RECOVERY_EMAIL || "chausselicita@gmail.com";
const PROD_URL     = "https://licitagov-one.vercel.app";

/** Segue um redirect HTTP e devolve o Location header (inclui o hash). */
function followRedirect(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      const loc = res.headers["location"];
      resolve(loc || url);
      res.resume(); // consumir o body para não vazar
    }).on("error", reject);
  });
}

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

  const actionLink = data?.properties?.action_link;
  if (!actionLink) throw new Error("Link não retornado: " + JSON.stringify(data));
  console.log("Action link:", actionLink);

  // 2. Resolver o redirect server-side (Node.js) para obter a URL final com hash
  //    Isso evita a cadeia Playwright→Supabase→Vercel que dispara bot-detection
  const appUrlWithHash = await followRedirect(actionLink);
  console.log("URL com hash (resolvida no Node):", appUrlWithHash);

  // Se o Supabase fez redirect encadeado, seguir mais um nível
  const finalAppUrl = appUrlWithHash.startsWith("https://xqlrfsrjvqmucchzpapk")
    ? await followRedirect(appUrlWithHash)
    : appUrlWithHash;
  console.log("URL final do app:", finalAppUrl);

  // 3. Abrir nova página e navegar DIRETO para a URL do app (sem passar pelo Supabase no browser)
  const page = await browser.newPage();

  const browserLogs = [];
  page.on("console", msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    browserLogs.push(text);
    if (msg.text().startsWith("[Auth]")) console.log("Browser Auth log:", text);
  });

  // Navegar direto para a URL final (app Vercel + hash com tokens)
  await page.goto(finalAppUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Aguardar React montar e processar o hash
  await page.waitForTimeout(4000);

  const pageUrl = page.url();
  const bodyText = (await page.evaluate(() => document.body.innerText)).slice(0, 400);
  console.log("URL no browser:", pageUrl);
  console.log("Conteúdo da página:", bodyText);
  console.log("Logs [Auth]:", browserLogs.filter(l => l.includes("[Auth]")).join(" | ") || "(nenhum)");

  // Screenshot como evidência
  await page.screenshot({ path: "G:\\Desktop\\licitaGov\\tests\\recovery-screenshot.png", fullPage: true });

  // 4. Verificar que a tela "Definir nova senha" aparece
  const heading = page.locator("text=Definir nova senha");
  await expect(heading).toBeVisible({ timeout: 12000 });

  console.log("✅ Tela 'Definir nova senha' confirmada na produção.");
});
