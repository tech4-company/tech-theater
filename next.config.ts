import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence "multiple lockfiles / wrong workspace root" warning by pinning the repo root.
  // This helps especially in monorepo-like parent directories.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
