import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse, type NextRequest } from 'next/server';
import { getBackendPort } from '@/lib/backendPort';

// Authorizes direct-from-browser uploads to Vercel Blob storage.
//
// Why this exists: Vercel serverless functions hard-cap request bodies at
// ~4.5MB. Videos routinely exceed that, so they were being rejected with a
// 413 at Vercel's platform edge before ever reaching our NestJS upload
// endpoint (which has its own, much larger, multer limit that never got a
// chance to apply). Vercel Blob's client-direct-upload pattern fixes this:
// the browser calls `upload()` from `@vercel/blob/client`, which first hits
// this lightweight route to exchange a short-lived token, then uploads the
// file bytes straight to Blob storage — never touching our serverless
// function's body-size ceiling at all.
//
// Security audit fix (3.5): this app used to authenticate via a Bearer JWT
// stored in localStorage, so the client passed `headers: { Authorization:
// ... } }` through `upload()`. The JWT now lives in an httpOnly cookie
// instead (never readable by page JS), so the browser attaches it to this
// same-origin request automatically -- we just need to forward that Cookie
// header on our own loopback call below, the same way the reverse-proxy
// route handler already does. We verify it by making a fast in-process
// loopback call to the already-booted NestJS app's `/auth/me`, reusing the
// exact same auth logic as every other authenticated endpoint instead of
// duplicating it. The Authorization header path is kept as a fallback for
// anything that still sends one (see JwtStrategy) -- costs nothing to keep.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
];

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  const authHeader = request.headers.get('authorization');
  const cookieHeader = request.headers.get('cookie');

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!authHeader?.startsWith('Bearer ') && !cookieHeader) {
          throw new Error('Not authenticated.');
        }
        const port = await getBackendPort();
        const forwardHeaders: Record<string, string> = {};
        if (cookieHeader) forwardHeaders.cookie = cookieHeader;
        if (authHeader) forwardHeaders.authorization = authHeader;
        if (process.env.VERCEL === '1' && request.headers.get('x-forwarded-for')) {
          forwardHeaders['x-forwarded-for'] = request.headers.get('x-forwarded-for')!;
        }
        const meRes = await fetch(`http://127.0.0.1:${port}/api/auth/me`, {
          headers: forwardHeaders,
        });
        if (!meRes.ok) {
          throw new Error('Not authenticated.');
        }
        const user = await meRes.json();
        const parts = pathname.split('/');
        if (parts.length !== 2 || !/^[a-zA-Z0-9_-]+$/.test(parts[0]) || !/^[a-zA-Z0-9._-]+$/.test(parts[1]) || parts[1] === '.' || parts[1] === '..') {
          throw new Error('Invalid brand upload path.');
        }
        const policyRes = await fetch(`http://127.0.0.1:${port}/api/brands/${parts[0]}/media/upload-policy`, { headers: forwardHeaders });
        if (!policyRes.ok) throw new Error('Upload not allowed. Check your brand access and storage limit.');
        const policy = await policyRes.json();
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: policy.maximumSizeInBytes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user?.id }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('[media-upload-token] blob upload completed', blob.url);
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Upload authorization failed.' },
      { status: 400 },
    );
  }
}
