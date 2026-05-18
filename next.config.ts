import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone is for Docker; Vercel uses its own output layout.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
