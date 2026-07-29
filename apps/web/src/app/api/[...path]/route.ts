import 'reflect-metadata';
import type { NextRequest } from 'next/server';

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
let backendPortPromise: Promise<number> | null = null;

async function getBackendPort(): Promise<number> {
  if (backendPortPromise) return backendPortPromise;

  backendPortPromise = (async () => {
    const { NestFactory } = await import('@nestjs/core');
    const { ValidationPipe } = await import('@nestjs/common');
    const { ExpressAdapter } = await import('@nestjs/platform-express');
    const expressModule = await import('express');
    const express = expressModule.default;
    const { AppModule } = await import('../../../../../api/src/app.module');

    const server = express();
    const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(server));

    nestApp.setGlobalPrefix('api');
    nestApp.enableCors({ origin: '*', credentials: true });
    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await nestApp.init();
    const httpServer = await nestApp.listen(0, '127.0.0.1');
    const address = httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to determine backend port');
    }
    return address.port;
  })();

  try {
    return await backendPortPromise;
  } catch (err) {
    // Don't cache a failed boot — let the next request retry.
    backendPortPromise = null;
    throw err;
  }
}

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
