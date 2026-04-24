import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "admin" | "client" | "cleaner";
  company?: string;
  phone?: string;
  hasCompletedSetup?: number;
}

interface AuthContext {
  user: AuthUser | null;
  loading: boolean;
  needsSetup: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  completeSetup: (newPassword: string) => Promise<void>;
}

const Ctx = createContext<AuthContext>({
  user: null,
  loading: true,
  needsSetup: false,
  login: async () => {},
  logout: async () => {},
  completeSetup: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("GET", "/api/auth/me")
      .then((r) => r.json())
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    setUser(data.user);
  }

  async function logout() {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
  }

  async function completeSetup(newPassword: string) {
    const res = await apiRequest("POST", "/api/auth/complete-setup", {
      newPassword,
      agreedToTerms: true,
      agreedToGdpr: true,
    });
    const data = await res.json();
    setUser(data.user);
  }

  const needsSetup = !!user && (user.role === "client" || user.role === "cleaner") && !user.hasCompletedSetup;

  return (
    <Ctx.Provider value={{ user, loading, needsSetup, login, logout, completeSetup }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
