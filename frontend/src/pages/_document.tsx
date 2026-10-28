// pages/_document.tsx
import * as React from "react";
import type { AppProps } from "next/app";
import type { EmotionCache } from "@emotion/react";
import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
  DocumentInitialProps,
} from "next/document";
import createEmotionServer from "@emotion/server/create-instance";
import createEmotionCache from "../lib/createEmotionCache";
import theme from "../theme";

export default class MyDocument extends Document<{
  emotionStyleTags: React.ReactElement[];
}> {
  static async getInitialProps(
    ctx: DocumentContext,
  ): Promise<
    DocumentInitialProps & { emotionStyleTags: React.ReactElement[] }
  > {
    const originalRenderPage = ctx.renderPage;
    const cache = createEmotionCache();
    const { extractCriticalToChunks } = createEmotionServer(cache);

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App) => {
          const AppWithCache = App as React.ComponentType<
            AppProps & { emotionCache: EmotionCache }
          >;
          return function EnhanceApp(props) {
            return <AppWithCache {...props} emotionCache={cache} />;
          };
        },
      });

    // 调用 Document.getInitialProps 而不是 Html.getInitialProps
    const initialProps = await Document.getInitialProps(ctx);

    const emotionStyles = extractCriticalToChunks(initialProps.html);
    const emotionStyleTags = emotionStyles.styles.map((style) => (
      <style
        key={style.key}
        data-emotion={`${style.key} ${style.ids.join(" ")}`}
        // React 抑制警告：使用 dangerouslySetInnerHTML
        dangerouslySetInnerHTML={{ __html: style.css }}
      />
    ));

    return {
      ...initialProps,
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
          {this.props.emotionStyleTags}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
