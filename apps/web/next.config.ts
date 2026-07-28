import type { NextConfig } from "next";

// NOTE: API routing is handled by the root vercel.json rewrite
// (/api/:path* -> the bundled NestJS serverless function), not here. This
// file previously also defined a conflicting rewrite that forwarded to a
// separate, now-retired "marketing-os-backend-api" Vercel project — that
// caused API calls to silently hit a stale/nonexistent deployment. Do not
// re-add an API rewrite here; the frontend and API share one origin.
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
