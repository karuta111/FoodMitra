import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Proxy all /api/v1/* requests to the standalone Express backend.
  // The browser calls Next.js on port 3000; Next.js forwards to the backend on port 4000.
  // This keeps everything same-origin from the browser's perspective (no CORS issues).
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
      {
        source: "/api/health",
        destination: `${BACKEND_URL}/health`,
      },
    ];
  },
};

export default nextConfig;
