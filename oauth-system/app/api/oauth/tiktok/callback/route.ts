import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/oauth/callback-handler";

export const dynamic = "force-dynamic";

const PKCE_COOKIE = "tiktok_pkce_verifier";

export async function GET(req: NextRequest) {
  const codeVerifier = req.cookies.get(PKCE_COOKIE)?.value;

  return handleOAuthCallback(req, "tiktok", {
    codeVerifier,
    clearCookie: (res: NextResponse) => {
      res.cookies.set(PKCE_COOKIE, "", { maxAge: 0, path: "/api/oauth/tiktok" });
    },
  });
}
