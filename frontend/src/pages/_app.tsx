// pages/_app.tsx
import * as React from 'react';
import { CacheProvider, EmotionCache } from '@emotion/react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { AppProps } from 'next/app';
import createEmotionCache from '../lib/createEmotionCache';
import theme from '../theme';

import { AuthProvider } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';

const clientSideEmotionCache = createEmotionCache();

interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

export default function MyApp(props: MyAppProps) {
  const { Component, pageProps, emotionCache = clientSideEmotionCache } = props;
  const router = useRouter();

  // 判断当前是否在 /auth/login 等公开路由
  const isAuthPage = router.pathname.startsWith('/auth');

  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <ProtectedRoute>
            {isAuthPage ? (
              // 登录 / 注册页：不用 Layout
              <Component {...pageProps} />
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
