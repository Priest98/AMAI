import type { NextConfig } from "next";
import path from "path";

// API routing: /api/* is handled natively by Next.js itself via the
// catch-all Route Handler at src/app/api/[...path]/route.ts, which boots
// the NestJS app (apps/api) in-process and reverse-proxies to it. This
// replaced an earlier vercel.json rewrite approach — Vercel's
// `framework: "nextjs"` mode reserves the whole /api/* namespace for Next's
// own router, so no rewrite (relative or absolute) could hand requests off
// to a separate sibling serverless function without either being silently
// swallowed into a 500 or, for a self-referencing absolute URL, causing an
// infinite rewrite loop. Do not reintroduce an /api rewrite here or in
// vercel.json.
//
// outputFileTracingRoot points at the monorepo root so Vercel's build
// correctly includes apps/api/src/** (imported by the route handler above)
// in the serverless function bundle, since it lives outside apps/web.
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
