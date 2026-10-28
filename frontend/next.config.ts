import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  transpilePackages: [
    "@mui/x-charts",
    "@mui/x-charts-vendor",
    "@mui/x-internals",
  ],
};
export default nextConfig;
