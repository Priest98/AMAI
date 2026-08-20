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
  // @sentry/node patches Node's module loader at runtime (via
  // require-in-the-middle/import-in-the-middle) for its auto-instrumentation
  // -- the same "dynamic require" shape that breaks under webpack bundling
  // as the Nest/Prisma packages above, so it needs the same external
  // treatment.
  "@sentry/node",
  // sharp ships a platform-specific native (.node) binary, loaded via its
  // own optional-require resolution across several @img/sharp-* packages
  // (one per platform/libvips variant) -- the exact same shape of problem
  // Prisma's engine binaries have, and it was missing this same treatment.
  // Root-caused from production data: every OptimizedMediaAsset row ever
  // created for an image was zero (only video passthrough rows existed,
  // and those don't touch sharp), and Instagram aspect-ratio publish
  // failures (ensureInstagramAspectRatio, also sharp-based) were ~27% of
  // all publish failures. Webpack bundling sharp instead of leaving it as
  // a plain runtime require() breaks its ability to find the correct
  // native binary for Vercel's Lambda runtime -- every sharp call was
  // very likely throwing and being silently swallowed by a try/catch
  // that falls back to "use the original, unmodified file" (both the
  // Media Optimization Engine and the legacy Instagram crop fallback are
  // deliberately built to never block publishing on an optimization
  // failure, which is correct in general but meant this specific failure
  // mode produced no visible error -- just images that were never
  // actually cropped, silently rejected by Instagram's aspect-ratio rule
  // at publish time instead).
  "sharp",
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
  webpack: (config) => {
    // sharp's own lib/utility.js does a guarded, try/catch-wrapped
    // require() of whichever @img/sharp-<platform>-* (or, for the wasm
    // fallback path, @img/sharp-wasm32) optional package matches the
    // machine it's running on, purely to read version metadata -- see
    // sharp's source. That package is deliberately NOT installed here
    // (npm's own cpu/os matching skips it, since Vercel's Lambda runtime
    // is linux-x64, not wasm32/darwin/win32), which is fine at runtime
    // since the require is inside a try/catch. It is NOT fine at build
    // time: even with "sharp" listed in serverExternalPackages above,
    // webpack still statically traces into this nested require chain
    // (reached via apps/api/src/queue/publishing.service.ts's sharp
    // import) and fails the whole build with a hard "Module not found"
    // instead of leaving it as an external runtime require. Explicitly
    // externalizing every @img/sharp-* platform/libvips variant name
    // (not just the one literal package that failed here) stops webpack
    // from resolving any of them, matching how the already-externalized
    // "sharp" package itself is supposed to behave.
    config.externals = config.externals || [];
    (config.externals as unknown[]).push(
      ({ request }: { request?: string }, callback: (err?: null, result?: string) => void) => {
        if (request && /^@img\/sharp-/.test(request)) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      },
    );
    return config;
  },
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
      {
        // Higgsfield-generated cinematic landing-page background assets.
        protocol: "https",
        hostname: "d8j0ntlcm91z4.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;
