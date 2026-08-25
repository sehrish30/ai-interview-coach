import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mastra/core", "@mastra/libsql", "@mastra/memory"],
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
