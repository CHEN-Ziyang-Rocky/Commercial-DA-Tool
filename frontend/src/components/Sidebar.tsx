import { Drawer, Toolbar, List, Typography, IconButton } from "@mui/material";
import { Home, People, Business, Menu, History } from "@mui/icons-material";
import { useState } from "react";
import NavItem, { NavNode } from "./NavItem";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useAuth } from "@/contexts/AuthContext";
export const drawerWidth = 240;
export default function Sidebar() {
  const isMdUp = useMediaQuery(useTheme().breakpoints.up("md"));
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const items: NavNode[] = [
    { label: "Management overview", to: "/", icon: <Home /> },
    { label: "Entities & reviews", to: "/entities", icon: <Business /> },
    { label: "Source changes", to: "/changes", icon: <History /> },
    ...(user?.role === "admin"
      ? [{ label: "Users", to: "/users/list", icon: <People /> }]
      : []),
  ];
  return (
    <>
      {!isMdUp && (
        <IconButton
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
          sx={{ position: "fixed", top: 8, left: 8, zIndex: 1200 }}
        >
          <Menu />
        </IconButton>
      )}
      <Drawer
        variant={isMdUp ? "permanent" : "temporary"}
        open={isMdUp || open}
        onClose={() => setOpen(false)}
        sx={{ "& .MuiDrawer-paper": { width: drawerWidth } }}
      >
        <Toolbar>
          <Typography fontWeight={700}>Commercial DA</Typography>
        </Toolbar>
        <List onClick={() => setOpen(false)}>
          {items.map((item) => (
            <NavItem key={item.label} node={item} />
          ))}
        </List>
      </Drawer>
    </>
  );
}
