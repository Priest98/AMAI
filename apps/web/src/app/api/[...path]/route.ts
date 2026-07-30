import 'reflect-metadata';
import type { NextRequest } from 'next/server';
import { getBackendPort } from '@/lib/backendPort';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Boots the existing NestJS API (apps/api) once per warm serverless
// invocation and has it listen on a local, OS-assigned loopback port.
// Every request to /api/* is then reverse-proxied to that local server.
//
// Why this exists: Vercel's `framework: "nextjs"` mode reserves the entire
// `/api/*` namespace for Next.js's own routing. Neither a relative nor an
// absolute-self-referencing `vercel.json` rewrite can hand those requests
// off to a separate sibling serverless function (the former gets silently
// swallowed by Next's internal router into a 500, the latter creates an
// infinite rewrite loop since the destination re-matches the same rule).
// Running the NestJS app from *inside* a Next.js catch-all Route Handler
// sidesteps the conflict entirely: Next owns /api/* natively, and this
// handler is just what runs when it does.
//
// getBackendPort() lives in src/lib/backendPort.ts so it can be reused by
// other Next.js routes (e.g. the Vercel Blob client-upload token route)
// that need to authenticate against this same in-process NestJS app.

const HOP_BY_HOP_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
]);

async function proxy(req: NextRequest): Promise<Response> {
  let port: number;
  try {
    port = await getBackendPort();
  } catch (err) {
    console.error('[api-proxy] backend failed to boot', err);
    return new Response(
      JSON.stringify({ statusCode: 500, message: 'Backend failed to start' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  const targetUrl = `http://127.0.0.1:${port}${req.nextUrl.pathname}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const hasBody = !['GET', 'HEAD'].includes(req.method);

  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    // Forward redirects to the browser instead of following them here.
    // OAuth connect endpoints (Instagram, TikTok, Google) respond with a
    // 302 to the provider's consent screen. With the default 'follow'
    // mode, this server-side fetch would silently follow that redirect,
    // fetch the provider's HTML itself, and hand back a 200 response
    // containing a page that was never meant to render outside the
    // provider's own origin (broken relative asset paths, blocked JS,
    // no cookies) — which is exactly what produced the blank page.
    redirect: 'manual',
  };
  if (hasBody) {
    init.duplex = 'half';
  }

  const backendResponse = await fetch(targetUrl, init);

  const responseHeaders = new Headers();
  backendResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest) {
  return proxy(req);
}
export async function POST(req: NextRequest) {
  return proxy(req);
}
export async function PUT(req: NextRequest) {
  return proxy(req);
}
export async function PATCH(req: NextRequest) {
  return proxy(req);
}
export async function DELETE(req: NextRequest) {
  return proxy(req);
}
export async function OPTIONS(req: NextRequest) {
  return proxy(req);
}
export async function HEAD(req: NextRequest) {
  return proxy(req);
}
