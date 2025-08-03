import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '@/lib/api';
import { useRouter } from 'next/router';

type JwtPayload = { sub: string; email: string; exp: number };

interface Ctx {
  user: JwtPayload | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<Ctx>({} as Ctx);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const router = useRouter();

  /* --------- read token on first load --------- */
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const payload = jwtDecode<JwtPayload>(token);
      if (payload.exp * 1000 > Date.now()) setUser(payload);
      else localStorage.removeItem('access_token');
    } catch {
      localStorage.removeItem('access_token');
    }
  }, []);

  /* --------- helpers --------- */
  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('access_token', data.access_token);
    setUser(jwtDecode(data.access_token));
    router.replace('/'); // home
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
    router.replace('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
