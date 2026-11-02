import { demoRequest, exitDemo } from "@/lib/demo";
import { useState } from "react";
import { Alert } from "@mui/material";
import { Box, Button, Stack, Typography } from "@mui/material";
import Sidebar, { drawerWidth } from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";
export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [error, setError] = useState("");
  const [confirmReset,setConfirmReset]=useState(false);
  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 2, md: 3 },
          pt: { xs: 7, md: 3 },
          minHeight: "100vh",
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Stack
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
          spacing={2}
          mb={3}
        >
          <Typography variant="body2">
            {user?.fullName} · {user?.role}
          </Typography>
          <Button onClick={logout}>Sign out</Button>
        </Stack>
        {user?.role === "demo" && <Alert severity="info" sx={{ mb: 2 }}>Demo mode · Sample data — GLEIF public snapshot; synthetic reviews.
          <Button onClick={() => setConfirmReset(true)}>Reset demo</Button>
          {confirmReset && <span>Restore your initial sample reviews? <Button onClick={async()=>{try{await demoRequest("/reset");window.location.reload();}catch{setError("Reset failed. Please retry.");}}}>Confirm reset</Button><Button onClick={()=>setConfirmReset(false)}>Cancel</Button></span>}
          <Button onClick={async () => { try { await exitDemo(); } catch { setError("Exit failed. Please retry."); } }}>Exit demo</Button>
        </Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        {children}
      </Box>
    </Box>
  );
}
