import type { NextConfig } from "next";

// Strip any trailing slash so the rewrite destinations below don't produce double-slash URLs
// (e.g. "https://host//api/v1/..." — which Render/Nginx reject with an HTML error page).
// Set BACKEND_URL without a trailing slash in production: https://your-backend.onrender.com
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Proxy all /api/v1/* and /uploads/* requests to the standalone Express backend.
  // The browser calls Next.js on port 3000; Next.js forwards to the backend on port 4000.
  // This keeps everything same-origin from the browser's perspective (no CORS issues,
  // and works inside sandboxes where the browser cannot reach port 4000 directly).
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
      {
        source: "/uploads/:path*",
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
