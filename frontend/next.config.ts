// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 禁用对外部 ESM 的强制外部化，回退到常规 CJS 解析
  experimental: {
    esmExternals: false,
  },
  webpack(config) {
    // 强制把 @mui/material/styles 导向它的 index.js 入口
    config.resolve.alias['@mui/material/styles'] =
      require.resolve('@mui/material/styles/index.js');
    return config;
  },
};

module.exports = nextConfig;
