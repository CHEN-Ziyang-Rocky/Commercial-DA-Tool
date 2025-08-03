import {
  Drawer,
  Toolbar,
  List,
  Box,
  IconButton,
  Switch,
  useMediaQuery,
} from '@mui/material';
import {
  Home,
  People,
  Business,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import NavItem, { NavNode } from './NavItem';
import { useTheme } from '@mui/material/styles';

export const drawerWidth = 240;

export default function Sidebar({
  toggleMode,
}: {
  toggleMode: () => void;
}) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen((o) => !o);

  const items: NavNode[] = [
    { label: 'Dashboard', to: '/', icon: <Home /> },
    {
      label: 'Users',
      icon: <People />,
      children: [
        { label: 'Profile', to: '/users/profile' },
        { label: 'List', to: '/users/list' },
        { label: 'Create', to: '/users/create' },
        { label: 'Edit', to: '/users/edit' },
        { label: 'Account', to: '/users/account' },
      ],
    },
    {
        label: 'Company',
        icon: <Business />,
        children: [
            { label: 'List', to: '/companies/list' },
            { label: 'Dynamic Chart', to: '/companies/chart' },   // ← 新增
        ],
    },
  ];

  /** Drawer 内容封装一次，供两种 variant 复用 */
  const drawer = (
    <>
      <Toolbar />
      <List dense sx={{ flexGrow: 1 }}>
        {items.map((n) => (
          <NavItem key={n.label} node={n} />
        ))}
      </List>
      <Box textAlign="center" mb={1}>
        <Switch onChange={toggleMode} />
      </Box>
    </>
  );

  return (
    <>
      {/* 小屏汉堡按钮 */}
      {!isMdUp && (
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            position: 'fixed',
            top: 8,
            left: 8,
            zIndex: theme.zIndex.drawer + 1,
            color: 'inherit',
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* ⬇ permanent on md↑ / temporary on sm↓ */}
      <Drawer
        variant={isMdUp ? 'permanent' : 'temporary'}
        open={isMdUp ? true : mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }} // 性能
        sx={{
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
}
