import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/oauth/current-user";
import { getValidAccessToken } from "@/lib/oauth/account-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { accountId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  if (!body.accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  // Note: this confirms the token is valid/refreshed server-side but
  // deliberately does NOT return the token itself to the client —
  // tokens should never leave the server. Use getValidAccessToken()
  // directly from other server-side code (e.g. a "post now" action)
  // when you actually need to call the provider's API.
  const token = await getValidAccessToken(userId, body.accountId);

  if (!token) {
    return NextResponse.json(
      { success: false, error: "refresh_failed_or_account_not_found" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
