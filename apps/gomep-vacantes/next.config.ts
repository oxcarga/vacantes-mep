import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["@gomep/schema"],
  agentRules: false,
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
