import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/oauth/current-user";
import { getProvider } from "@/lib/oauth/providers/registry";
import { createSignedState } from "@/lib/oauth/state";

export const dynamic = "force-dynamic";

const PKCE_COOKIE = "tiktok_pkce_verifier";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const state = createSignedState(userId, "tiktok");
  const provider = getProvider("tiktok");
  const { authorizationUrl, codeVerifier } = provider.buildAuthorizationRequest(state);

  const response = NextResponse.redirect(authorizationUrl);

  // The PKCE code_verifier must be presented again at the callback, but
  // TikTok only round-trips `state` for us. A short-lived, httpOnly cookie
  // is the standard way to carry it across the redirect without exposing
  // it in the URL/state (which can end up in logs, referrers, etc).
  response.cookies.set(PKCE_COOKIE, codeVerifier!, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes, matches state TTL
    path: "/api/oauth/tiktok",
  });

  return response;
}
