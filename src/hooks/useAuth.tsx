/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type AppRole = "superadmin" | "admin" | "contador" | "empleado";

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  mustChangePassword: boolean;
  loading: boolean;
  refreshAuthState: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  mustChangePassword: false,
  loading: true,
  refreshAuthState: async () => {},
  signOut: async () => {},
});

function normalizeRole(value: unknown): AppRole {
  return value === "superadmin" || value === "admin" || value === "contador" || value === "empleado"
    ? value
    : "empleado";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc("get_user_role", { _user_id: userId });
      if (error) {
        console.error("No se pudo obtener el rol del usuario", error);
        setRole("empleado");
        return;
      }
      setRole(normalizeRole(data));
    } catch (error) {
      console.error("Fallo inesperado obteniendo el rol", error);
      setRole("empleado");
    }
  }, []);

  const fetchPasswordStatus = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("No se pudo obtener el estado de clave temporal", error);
        setMustChangePassword(false);
        return;
      }

      setMustChangePassword(Boolean(data?.must_change_password));
    } catch (error) {
      console.error("Fallo inesperado obteniendo el estado de clave temporal", error);
      setMustChangePassword(false);
    }
  }, []);

  const syncSession = useCallback(async (sessionUser: User | null) => {
    setUser(sessionUser);

    if (!sessionUser) {
      setRole(null);
      setMustChangePassword(false);
      setLoading(false);
      return;
    }

    await Promise.all([
      fetchRole(sessionUser.id),
      fetchPasswordStatus(sessionUser.id),
    ]);
    setLoading(false);
  }, [fetchPasswordStatus, fetchRole]);

  const refreshAuthState = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await syncSession(session?.user ?? null);
  }, [syncSession]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session?.user ?? null);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      return syncSession(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [syncSession]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setMustChangePassword(false);
  };

  return (
    <AuthContext.Provider value={{ user, role, mustChangePassword, loading, refreshAuthState, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

const rolePermissions: Record<AppRole, string[]> = {
  superadmin: ["dashboard", "configuracion"],
  admin: ["dashboard", "facturacion", "clientes", "productos", "reportes", "configuracion"],
  contador: ["dashboard", "facturacion", "clientes", "reportes", "configuracion"],
  empleado: ["dashboard", "facturacion", "configuracion"],
};

export function hasPermission(role: AppRole | null, module: string): boolean {
  if (!role) return false;
  return rolePermissions[role]?.includes(module) ?? false;
}
