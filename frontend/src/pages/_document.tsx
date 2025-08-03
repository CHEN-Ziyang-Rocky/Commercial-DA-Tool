// pages/_document.tsx
import * as React from 'react';
import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
  DocumentInitialProps,
} from 'next/document';
import createEmotionServer from '@emotion/server/create-instance';
import createEmotionCache from '../lib/createEmotionCache';
import theme from '../theme';

export default class MyDocument extends Document<{ emotionStyleTags: JSX.Element[] }> {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps & { emotionStyleTags: JSX.Element[] }> {
    const originalRenderPage = ctx.renderPage;
    const cache = createEmotionCache();
    const { extractCriticalToChunks } = createEmotionServer(cache);

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App: any) =>
          function EnhanceApp(props) {
            return <App emotionCache={cache} {...props} />;
          },
      });

    // 调用 Document.getInitialProps 而不是 Html.getInitialProps
    const initialProps = await Document.getInitialProps(ctx);

    const emotionStyles = extractCriticalToChunks(initialProps.html);
    const emotionStyleTags = emotionStyles.styles.map((style) => (
      <style
        key={style.key}
        data-emotion={`${style.key} ${style.ids.join(' ')}`}
        // React 抑制警告：使用 dangerouslySetInnerHTML
        dangerouslySetInnerHTML={{ __html: style.css }}
      />
    ));

    return {
      ...initialProps,
      // 把 emotionStyleTags 追加到原有 styles
      styles: [...React.Children.toArray(initialProps.styles), ...emotionStyleTags],
      emotionStyleTags,
    };
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          {/* PWA primary color */}
          <meta name="theme-color" content={theme.palette.primary.main} />
          {/* emotion 样式 */}
          {(this.props as any).emotionStyleTags}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
