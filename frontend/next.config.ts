import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: ["@locate/sdk", "@solana/wallet-adapter-base", "@solana/wallet-adapter-react", "@solana/wallet-adapter-react-ui"],
  turbopack: {
    resolveAlias: {
      "@locate/sdk": "./vendor/locate-sdk/index.js",
    },
  },
  env: {
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? "https://locate-api-znz1.onrender.com",
    VITE_SOLANA_CLUSTER: process.env.VITE_SOLANA_CLUSTER ?? "devnet",
    VITE_SOLANA_RPC_URL: process.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    VITE_LOCATE_PROGRAM_ID: process.env.VITE_LOCATE_PROGRAM_ID ?? "F1CiKj7c91ptZsLseX49JTsXtAKykkXSV7Ri468RhqS6",
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
};

export default nextConfig;
