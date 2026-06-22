-- ============================================================
-- LicitaGov — RBAC Migration
-- Execute no Supabase SQL Editor: xqlrfsrjvqmucchzpapk
-- ============================================================

-- 1. Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  nome TEXT,
  role TEXT NOT NULL DEFAULT 'cliente'
    CHECK (role IN ('super_admin', 'cliente', 'visitante')),
  prefeitura_nome TEXT,
  prefeitura_municipio TEXT,
  tenant_id UUID DEFAULT gen_random_uuid(),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inserir super admin (roda somente se o user existir)
INSERT INTO user_profiles (id, email, role, nome, prefeitura_nome)
SELECT id, email, 'super_admin', 'Clériston', 'GovCore'
FROM auth.users
WHERE email = 'chausselicita@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'super_admin', nome = 'Clériston';

-- 3. RLS em user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario ve proprio perfil" ON user_profiles;
CREATE POLICY "usuario ve proprio perfil" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "super admin ve todos" ON user_profiles;
CREATE POLICY "super admin ve todos" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- 4. Portal de Transparência — acesso anônimo a processos publicados
-- Se RLS ainda não está habilitada em processos:
ALTER TABLE processos ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados — acesso total
DROP POLICY IF EXISTS "autenticado acesso total processos" ON processos;
CREATE POLICY "autenticado acesso total processos" ON processos
  FOR ALL USING (auth.role() = 'authenticated');

-- Política para portal público — somente processos publicados/homologados
DROP POLICY IF EXISTS "portal publico processos" ON processos;
CREATE POLICY "portal publico processos" ON processos
  FOR SELECT USING (
    auth.role() = 'anon'
    AND status IN ('Publicado', 'Homologado')
  );

-- 5. Recarregar schema PostgREST
NOTIFY pgrst, 'reload schema';
