import { Alert, Box, Button, CircularProgress } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/router";
import { useEffect } from "react";
export default function ProtectedRoute({
  children,
}: {
  children: React.ReactElement;
}) {
  const { user, loading, error, retry, logout } = useAuth();
  const router = useRouter();
  const isPublic = router.pathname === "/auth/login";
  useEffect(() => {
    if (router.isReady && !loading && !error && !user && !isPublic)
      void router.replace({
        pathname: "/auth/login",
        query: { next: router.asPath },
      });
  }, [user, loading, error, isPublic, router]);
  if (isPublic) return children;
  if (loading)
    return (
      <Box p={5}>
        <CircularProgress aria-label="Restoring session" />
      </Box>
    );
  if (error)
    return (
      <Box p={5}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={retry}>Retry</Button>
        <Button onClick={logout}>Sign out</Button>
      </Box>
    );
  if (!user) return null;
  if (router.pathname.startsWith("/users") && user.role !== "admin")
    return (
      <Box p={5}>
        <Alert severity="warning">Administrator access required.</Alert>
        <Button href="/">Back to dashboard</Button>
      </Box>
    );
  return children;
}
