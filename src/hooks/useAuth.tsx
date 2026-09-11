import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "cliente";

export interface Organization {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  onboarding_completed: boolean;
}

interface AuthValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: Role | null;
  fullName: string | null;
  organization: Organization | null;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  loading: true,
  role: null,
  fullName: null,
  organization: null,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  const loadProfile = async (userId: string) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("full_name, organization_id").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setFullName(profile?.full_name ?? null);
    setRole(((roles?.[0]?.role as Role | undefined) ?? "admin") as Role);
    if (profile?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, industry, size, onboarding_completed")
        .eq("id", profile.organization_id)
        .maybeSingle();
      setOrganization((org as Organization) ?? null);
    } else {
      setOrganization(null);
    }
  };

  const refresh = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) await loadProfile(data.user.id);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setTimeout(() => void loadProfile(newSession.user.id), 0);
      } else {
        setRole(null);
        setOrganization(null);
        setFullName(null);
      }
    });

    void (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        role,
        fullName,
        organization,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
