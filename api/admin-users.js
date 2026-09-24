// Criação de usuário/tenant e reset de senha (super_admin only) — combinados
// num único arquivo por causa do teto de 12 Serverless Functions do plano
// Hobby da Vercel. Roteado por req.body.action: "create" | "reset-password".
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function gerarSenhaProvisoria() {
  const base = crypto.randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
  const simbolo = "!@#$%&*"[crypto.randomInt(7)];
  const digito = crypto.randomInt(10);
  return `${base.slice(0, 10)}${simbolo}${digito}`;
}

async function autenticarSuperAdmin(req, adminSb) {
  const authHeader = req.headers.authorization || "";
  const callerToken = authHeader.replace("Bearer ", "");
  if (!callerToken) return { error: { status: 401, message: "Unauthorized" } };

  const { data: { user }, error: authErr } = await adminSb.auth.getUser(callerToken);
  if (authErr || !user) return { error: { status: 401, message: "Token inválido" } };

  const { data: profile } = await adminSb.from("user_profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "super_admin") return { error: { status: 403, message: "Acesso negado" } };

  return { user };
}

async function handleCreate(req, res, adminSb) {
  const {
    email, nome, prefeitura_nome, prefeitura_municipio, uf, cnpj,
    responsavel_telefone, tenant_id: tenantIdExistente,
  } = req.body || {};
  if (!email) return res.status(400).json({ error: "email é obrigatório" });
  if (!tenantIdExistente && !prefeitura_nome) {
    return res.status(400).json({ error: "prefeitura_nome é obrigatório para criar uma nova prefeitura" });
  }

  let tenantId = tenantIdExistente || null;
  let tenantCriado = null;

  if (!tenantId) {
    const { data: tenant, error: tenantErr } = await adminSb
      .from("tenants")
      .insert({
        nome: prefeitura_nome,
        municipio: prefeitura_municipio || null,
        uf: uf || null,
        cnpj: cnpj || null,
        responsavel_nome: nome || null,
        responsavel_telefone: responsavel_telefone || null,
        email_institucional: email,
        ativo: true,
      })
      .select()
      .single();
    if (tenantErr) return res.status(400).json({ error: tenantErr.message });
    tenantId = tenant.id;
    tenantCriado = tenant;
  }

  const senhaProvisoria = gerarSenhaProvisoria();

  const { data: authData, error: createErr } = await adminSb.auth.admin.createUser({
    email,
    password: senhaProvisoria,
    email_confirm: true,
  });
  if (createErr) {
    if (tenantCriado) await adminSb.from("tenants").delete().eq("id", tenantCriado.id);
    return res.status(400).json({ error: createErr.message });
  }

  const { error: profileErr } = await adminSb.from("user_profiles").insert({
    id: authData.user.id,
    email,
    nome: nome || prefeitura_nome,
    role: "cliente",
    prefeitura_nome: prefeitura_nome || tenantCriado?.nome,
    prefeitura_municipio: prefeitura_municipio || "",
    tenant_id: tenantId,
    ativo: true,
  });
  if (profileErr) {
    await adminSb.auth.admin.deleteUser(authData.user.id);
    if (tenantCriado) await adminSb.from("tenants").delete().eq("id", tenantCriado.id);
    return res.status(400).json({ error: profileErr.message });
  }

  return res.json({
    success: true,
    user: { id: authData.user.id, email },
    tenant: tenantCriado || { id: tenantId },
    senhaProvisoria,
  });
}

async function handleResetPassword(req, res, adminSb) {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId é obrigatório" });

  const senhaProvisoria = gerarSenhaProvisoria();
  const { error: updateErr } = await adminSb.auth.admin.updateUserById(userId, { password: senhaProvisoria });
  if (updateErr) return res.status(400).json({ error: updateErr.message });

  return res.json({ success: true, senhaProvisoria });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://xqlrfsrjvqmucchzpapk.supabase.co";
    if (!serviceKey) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel" });

    const adminSb = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { error: authError } = await autenticarSuperAdmin(req, adminSb);
    if (authError) return res.status(authError.status).json({ error: authError.message });

    const { action } = req.body || {};
    if (action === "create") return handleCreate(req, res, adminSb);
    if (action === "reset-password") return handleResetPassword(req, res, adminSb);
    return res.status(400).json({ error: 'action deve ser "create" ou "reset-password"' });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erro inesperado" });
  }
}
