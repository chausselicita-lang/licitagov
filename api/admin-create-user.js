const { createClient } = require("@supabase/supabase-js");

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

  // Verify caller is super_admin
  const { data: { user }, error: authErr } = await adminSb.auth.getUser(callerToken);
  if (authErr || !user) return res.status(401).json({ error: "Token inválido" });

  const { data: profile } = await adminSb.from("user_profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "super_admin") return res.status(403).json({ error: "Acesso negado" });

  const { email, password, nome, prefeitura_nome, prefeitura_municipio } = req.body || {};
  if (!email || !password || !prefeitura_nome) return res.status(400).json({ error: "email, password e prefeitura_nome são obrigatórios" });

  const { data: authData, error: createErr } = await adminSb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) return res.status(400).json({ error: createErr.message });

  const { error: profileErr } = await adminSb.from("user_profiles").insert({
    id: authData.user.id,
    email,
    nome: nome || prefeitura_nome,
    role: "cliente",
    prefeitura_nome,
    prefeitura_municipio: prefeitura_municipio || "",
    ativo: true,
  });
  if (profileErr) {
    await adminSb.auth.admin.deleteUser(authData.user.id);
    return res.status(400).json({ error: profileErr.message });
  }

  res.json({ success: true, user: { id: authData.user.id, email } });
};
