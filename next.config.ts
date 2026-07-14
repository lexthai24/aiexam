import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without this, Next.js detects the
  // parent directory's lockfile (C:\newwork\package-lock.json) and warns about
  // an ambiguous root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
