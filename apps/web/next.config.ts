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
//
// serverExternalPackages: the NestJS/Prisma dependency tree relies on
// dynamic, try/catch-wrapped requires for optional peers it doesn't
// actually need (e.g. @nestjs/core opportunistically requires
// @nestjs/websockets and @nestjs/microservices, neither of which is
// installed since this app uses neither feature) and, for Prisma, native
// binary engines webpack can't statically bundle. Marking these packages
// external tells Next's build to leave them as plain runtime `require()`
// calls instead of trying to bundle them, which is what lets Nest's own
// optional-require fallback work the same way it does under a normal
// `node dist/main.js` run.
const nestAndPrismaPackages = [
  "@nestjs/bullmq",
  "@nestjs/common",
  "@nestjs/config",
  "@nestjs/core",
  "@nestjs/event-emitter",
  "@nestjs/jwt",
  "@nestjs/passport",
  "@nestjs/platform-express",
  "@nestjs/schedule",
  "@nestjs/throttler",
  "@prisma/client",
  "prisma",
  "bullmq",
  "class-transformer",
  "class-validator",
  "express",
  "passport",
  "passport-jwt",
  "passport-oauth2",
  "reflect-metadata",
];

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: path.join(__dirname, "../../"),
  serverExternalPackages: nestAndPrismaPackages,
  images: {
    // Media Library thumbnails are served straight from Vercel Blob
    // storage (see apps/api/src/storage/storage.service.ts). Allow-listing
    // the host lets next/image resize/re-encode them on the fly instead of
    // the browser downloading full-resolution originals for a small grid
    // thumbnail.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
