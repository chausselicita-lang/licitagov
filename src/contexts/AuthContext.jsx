import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getSupabase } from "../lib/supabase.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children, session }) {
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  // Evita reexibir a tela cheia de "Verificando permissões" (que desmonta o
  // app inteiro, fechando qualquer modal aberto) quando o Supabase apenas
  // renova o token em segundo plano (TOKEN_REFRESHED) — isso acontece
  // automaticamente sempre que a aba volta a ficar visível, sem precisar de
  // fazer nada. Só mostra o loading na primeira vez que este usuário loga.
  const loadedUserIdRef = useRef(null);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setUserProfile(null); loadedUserIdRef.current = null; return; }
    const isBackgroundRefresh = loadedUserIdRef.current === userId;
    if (!isBackgroundRefresh) setProfileLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) return;
      const { data } = await sb.from("user_profiles").select("*").eq("id", userId).single();
      setUserProfile(data || null);
      loadedUserIdRef.current = userId;
    } catch {
      setUserProfile(null);
    } finally {
      if (!isBackgroundRefresh) setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) fetchProfile(session.user.id);
    else setUserProfile(null);
  }, [session, fetchProfile]);

  const role = userProfile?.role || null;

  return (
    <AuthCtx.Provider value={{
      userProfile,
      profileLoading,
      role,
      isSuperAdmin: role === "super_admin",
      isCliente: role === "cliente",
      prefeitura: userProfile?.prefeitura_nome || null,
      municipio: userProfile?.prefeitura_municipio || null,
      tenantId: userProfile?.tenant_id || null,
      nome: userProfile?.nome || null,
      refreshProfile: () => session?.user?.id && fetchProfile(session.user.id),
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
