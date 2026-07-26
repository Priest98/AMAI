import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/oauth/current-user";
import { getProvider } from "@/lib/oauth/providers/registry";
import { createSignedState } from "@/lib/oauth/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const state = createSignedState(userId, "instagram");
  const provider = getProvider("instagram");
  const { authorizationUrl } = provider.buildAuthorizationRequest(state);

  return NextResponse.redirect(authorizationUrl);
}
