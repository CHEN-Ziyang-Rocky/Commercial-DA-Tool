import { Box, CssBaseline, Toolbar } from '@mui/material';
import { useState } from 'react';
import Sidebar, { drawerWidth } from './Sidebar';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('dark');
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  // 简易地把 theme.mode 改写，若你有高级切换逻辑可替换
  theme.palette.mode = mode;

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      <Sidebar
        toggleMode={() => setMode((p) => (p === 'light' ? 'dark' : 'light'))}
      />

      {/* 主内容区：大屏时给左侧留 drawerWidth， 小屏为 0 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          minHeight: '100vh',
          bgcolor: 'background.default',
          ml: { md: `${drawerWidth}px` }, // md↑ 留出空间
        }}
      >
        {/* 把 Drawer 顶部的 Toolbar 高度补齐，防止内容被遮 */}
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
