import 'reflect-metadata';

// Boots the existing NestJS API (apps/api) once per warm serverless
// invocation and has it listen on a local, OS-assigned loopback port.
//
// Why this exists: Vercel's `framework: "nextjs"` mode reserves the entire
// `/api/*` namespace for Next.js's own routing, so the NestJS app has to be
// booted *inside* a Next.js Route Handler rather than as a sibling
// serverless function. This helper is shared by every Next.js route that
// needs to talk to the NestJS app in-process — originally just the
// `/api/*` catch-all reverse proxy, now also the Vercel Blob client-upload
// token route, which needs to reuse the same JWT auth as the rest of the API.
let backendPortPromise: Promise<number> | null = null;

export async function getBackendPort(): Promise<number> {
  if (backendPortPromise) return backendPortPromise;

  backendPortPromise = (async () => {
    const { NestFactory } = await import('@nestjs/core');
    const { ValidationPipe } = await import('@nestjs/common');
    const { ExpressAdapter } = await import('@nestjs/platform-express');
    const expressModule = await import('express');
    const express = expressModule.default;
    const { AppModule } = await import('../../../api/src/app.module');

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
