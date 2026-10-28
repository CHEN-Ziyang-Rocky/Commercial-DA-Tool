import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { jwtDecode } from "jwt-decode";
import api, { errorMessage } from "@/lib/api";
import { useRouter } from "next/router";
import { safeReturnPath } from "@/lib/return-path";
interface Identity {
  sub: string;
  email: string;
  fullName: string;
  role: "user" | "admin";
}
interface Auth {
  user: Identity | null;
  loading: boolean;
  error: string;
  retry: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<Auth>({} as Auth);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const router = useRouter();
  const clearSession = useCallback(() => {
    localStorage.removeItem("access_token");
    setUser(null);
    setError("");
    setLoading(false);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    window.addEventListener("auth:expired", clearSession);
    const token = localStorage.getItem("access_token");
    const restore = async () => {
      setLoading(true);
      setError("");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { exp } = jwtDecode<{ exp: number }>(token);
        if (!exp || exp * 1000 <= Date.now()) {
          clearSession();
          return;
        }
      } catch {
        clearSession();
        return;
      }
      try {
        const { data } = await api.get<Identity>("/auth/me", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setUser(data);
      } catch (err) {
        if (!controller.signal.aborted && localStorage.getItem("access_token"))
          setError(errorMessage(err));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void restore();
    // Expiry is also checked while a page remains open, before the next request.
    const timer = window.setInterval(() => {
      const current = localStorage.getItem("access_token");
      if (current) {
        try {
          if (jwtDecode<{ exp: number }>(current).exp * 1000 <= Date.now())
            clearSession();
        } catch {
          clearSession();
        }
      }
    }, 1000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("auth:expired", clearSession);
    };
  }, [clearSession, version]);
  const login = async (email: string, password: string) => {
    const { data } = await api.post<{ access_token: string }>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("access_token", data.access_token);
    try {
      const response = await api.get<Identity>("/auth/me");
      setUser(response.data);
      setError("");
      await router.replace(safeReturnPath(router.query.next));
    } catch (err) {
      clearSession();
      throw err;
    }
  };
  const logout = () => {
    clearSession();
    void router.replace("/auth/login");
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        retry: () => setVersion((v) => v + 1),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
