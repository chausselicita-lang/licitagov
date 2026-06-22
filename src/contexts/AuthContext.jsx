import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getSupabase } from "../lib/supabase.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children, session }) {
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setUserProfile(null); return; }
    setProfileLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) return;
      const { data } = await sb.from("user_profiles").select("*").eq("id", userId).single();
      setUserProfile(data || null);
    } catch {
      setUserProfile(null);
    } finally {
      setProfileLoading(false);
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
