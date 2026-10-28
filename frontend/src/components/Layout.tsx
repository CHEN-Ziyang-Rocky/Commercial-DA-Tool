import { Box, Button, Stack, Typography } from "@mui/material";
import Sidebar, { drawerWidth } from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";
export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
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
        {children}
      </Box>
    </Box>
  );
}
