// pages/_app.tsx
import * as React from "react";
import { CacheProvider, EmotionCache } from "@emotion/react";
import { Box, CssBaseline, ThemeProvider, Typography } from "@mui/material";
import { AppProps } from "next/app";
import createEmotionCache from "../lib/createEmotionCache";
import theme from "../theme";

import { AuthProvider } from "../contexts/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/Layout";
import ProjectLinks from "../components/ProjectLinks";
import { useRouter } from "next/router";

const clientSideEmotionCache = createEmotionCache();

interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

export default function MyApp(props: MyAppProps) {
  const { Component, pageProps, emotionCache = clientSideEmotionCache } = props;
  const router = useRouter();

  // 判断当前是否在 /auth/login 等公开路由
  const isAuthPage = router.pathname.startsWith("/auth") || router.pathname === "/demo";

  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <ProtectedRoute>
            {isAuthPage ? (
              // 登录 / 注册页：不用 Layout
              <>
                <Box component="header" sx={{ position: "sticky", top: 0, zIndex: "appBar", bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", minHeight: 64, px: { xs: 2, md: 3 }, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                  <Typography component="a" href="/demo" sx={{ color: "text.primary", textDecoration: "none", fontWeight: 700, fontSize: { xs: 13, sm: 16 } }}>Commercial DA</Typography>
                  <ProjectLinks />
                </Box>
                <Component {...pageProps} />
              </>
            ) : (
              // 其他受保护页：套上原有 Layout（含导航栏）
              <Layout>
                <Component {...pageProps} />
              </Layout>
            )}
          </ProtectedRoute>
        </AuthProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}
