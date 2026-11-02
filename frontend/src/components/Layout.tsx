import { demoRequest, exitDemo } from "@/lib/demo";
import { useState } from "react";
import { Alert, Box, Button, IconButton, Stack, Typography } from "@mui/material";
import { LogoutOutlined } from "@mui/icons-material";
import Sidebar, { drawerWidth } from "./Sidebar";
import ProjectLinks from "./ProjectLinks";
import { useAuth } from "@/contexts/AuthContext";
export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, minHeight: "100vh", ml: { md: `${drawerWidth}px` } }}>
        <Box component="header" data-app-chrome sx={{ position: "sticky", top: 0, zIndex: "appBar", bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: "0 2px 8px rgba(20,47,60,.04)" }}>
          <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={{ xs: 1, sm: 2 }} sx={{ minHeight: 64, px: { xs: 2, md: 3 }, pl: { xs: 7, md: 3 } }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", sm: "block" }, mr: "auto" }}>
              {user?.fullName} · {user?.role}
            </Typography>
            <ProjectLinks />
            {user?.role !== "demo" && <>
              <Button onClick={logout} sx={{ display: { xs: "none", sm: "inline-flex" } }}>Sign out</Button>
              <IconButton aria-label="Sign out" onClick={logout} sx={{ display: { xs: "inline-flex", sm: "none" } }}><LogoutOutlined fontSize="small" /></IconButton>
            </>}
          </Stack>
          {user?.role === "demo" && <Box role="region" aria-label="Demo controls" sx={{ px: { xs: 2, md: 3 }, py: 0.75, bgcolor: "#eef5f6", borderTop: 1, borderColor: "divider" }}>
            <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={1}>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Demo mode · Sample data</Typography>
                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>GLEIF public data · Synthetic reviews</Typography>
              </Box>
              <Stack direction="row" sx={{ "& .MuiButton-root": { minWidth: 0, minHeight: 44, px: 1, fontSize: 11 } }}>
                <Button onClick={() => setConfirmReset(true)}>Reset demo</Button>
                <Button onClick={async () => { try { await exitDemo(); } catch { setError("Exit failed. Please retry."); } }}>Exit demo</Button>
              </Stack>
            </Stack>
            {confirmReset && <Box sx={{ py: 1 }}>
              <Typography variant="body2">Restore your initial sample reviews?</Typography>
              <Button onClick={async () => { try { await demoRequest("/reset"); window.location.reload(); } catch { setError("Reset failed. Please retry."); } }}>Confirm reset</Button>
              <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
            </Box>}
          </Box>}
          {error && <Alert severity="error">{error}</Alert>}
        </Box>
        <Box sx={{ p: { xs: 2, md: 3 }, "& [id]": { scrollMarginTop: 180 } }}>{children}</Box>
      </Box>
    </Box>
  );
}
