import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  const router = useRouter();
  const publicPaths = ['/auth/login'];

  useEffect(() => {
    if (!user && !publicPaths.includes(router.pathname)) {
      router.replace('/auth/login');
    }
  }, [user, router]);

  if (!user && !publicPaths.includes(router.pathname)) return null;
  return children;
}
