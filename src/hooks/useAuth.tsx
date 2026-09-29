import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { getCurrentUserFn } from "@/services/authService.functions";

export type Role = "admin" | "cliente";

export interface Organization {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  onboardingCompleted: boolean;
}

interface AuthValue {
  user: User | null;
  loading: boolean;
  role: Role | null;
  fullName: string | null;
  organization: Organization | null;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  role: null,
  fullName: null,
  organization: null,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  const loadProfile = async () => {
    const me = await getCurrentUserFn();
    setFullName(me.fullName);
    setRole(me.role as Role);
    setOrganization(me.organization);
  };

  const refresh = async () => {
    if (getFirebaseAuth().currentUser) await loadProfile();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        void loadProfile();
      } else {
        setRole(null);
        setOrganization(null);
        setFullName(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, role, fullName, organization, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
