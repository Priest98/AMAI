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

    // The billing webhook (currently Paystack, see billing.module.ts) and
    // the Instagram/Meta comment webhook
    // (apps/api/src/billing/billing.controller.ts,
    // apps/api/src/webhooks/webhooks.controller.ts) both need the exact raw
    // request bytes to verify their provider's signature -- parsing to JSON
    // first (Nest's default bodyParser behavior) would change the bytes and
    // always fail verification. bodyParser: false below disables Nest's
    // automatic parsing so we can apply it ourselves: each webhook path gets
    // express.raw() (keeps req.body a Buffer), every other path gets the
    // normal express.json()/urlencoded() Nest would have used anyway.
    //
    // Added during the V2 full-system audit: the Instagram webhook handler
    // received an x-hub-signature-256 header but never verified it (the
    // body arrived pre-parsed as JSON with no way to recover the exact
    // signed bytes) -- anyone could POST a forged payload claiming to be
    // Meta. Wiring the raw body through here is what makes real
    // verification in the controller possible at all.
    server.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
    server.use('/api/webhooks/instagram', express.raw({ type: 'application/json' }));
    // TikTok's comment webhook previously had zero signature verification
    // (a known, explicitly-flagged gap from the V2 full-system audit) --
    // same raw-body requirement as Instagram/billing above, needed so
    // apps/api/src/webhooks/webhooks.controller.ts can verify TikTok's
    // documented Tiktok-Signature HMAC-SHA256 scheme against the exact
    // bytes TikTok signed. See https://developers.tiktok.com/doc/webhooks-verification.
    server.use('/api/webhooks/tiktok', express.raw({ type: 'application/json' }));
    server.use((req, res, next) => {
      if (Buffer.isBuffer(req.body)) return next(); // already handled by express.raw() above
      return express.json()(req, res, next);
    });
    server.use(express.urlencoded({ extended: true }));

    const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(server), { bodyParser: false });

    nestApp.setGlobalPrefix('api');
    // Security audit fix (7.1): this used to be `origin: '*'` with
    // `credentials: true` -- an invalid combination per the Fetch spec, and
    // one that let literally any website's client-side JS read responses
    // from this API cross-origin. Auth here is a Bearer JWT attached
    // manually by our own frontend (not an ambient cookie), so this was
    // never a full session-hijack vector, but it defeated CORS as a
    // defense-in-depth backstop for any endpoint that's ever accidentally
    // left unguarded. Restrict to the app's own origins.
    const corsAllowedOrigins = [
      process.env.APP_URL, // canonical deployment URL, see apps/api/src/common/app-url.util.ts
      process.env.FRONTEND_URL, // legacy/alt var, also read by apps/api/src/main.ts
      'http://localhost:3000',
    ].filter((origin): origin is string => Boolean(origin))
      .map((origin) => origin.replace(/\/$/, ''));
    nestApp.enableCors({
      origin: corsAllowedOrigins.length > 0 ? corsAllowedOrigins : 'http://localhost:3000',
      credentials: true,
    });
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
