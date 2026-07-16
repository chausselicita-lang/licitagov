const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

function gerarSenhaProvisoria() {
  const base = crypto.randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
  const simbolo = "!@#$%&*"[crypto.randomInt(7)];
  const digito = crypto.randomInt(10);
  return `${base.slice(0, 10)}${simbolo}${digito}`;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization || "";
  const callerToken = authHeader.replace("Bearer ", "");
  if (!callerToken) return res.status(401).json({ error: "Unauthorized" });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://xqlrfsrjvqmucchzpapk.supabase.co";
  if (!serviceKey) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel" });

  const adminSb = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: { user }, error: authErr } = await adminSb.auth.getUser(callerToken);
  if (authErr || !user) return res.status(401).json({ error: "Token inválido" });

  const { data: profile } = await adminSb.from("user_profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "super_admin") return res.status(403).json({ error: "Acesso negado" });

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId é obrigatório" });

  const senhaProvisoria = gerarSenhaProvisoria();
  const { error: updateErr } = await adminSb.auth.admin.updateUserById(userId, { password: senhaProvisoria });
  if (updateErr) return res.status(400).json({ error: updateErr.message });

  res.json({ success: true, senhaProvisoria });
};
