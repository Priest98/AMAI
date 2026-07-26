import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/oauth/current-user";
import { disconnectAccount } from "@/lib/oauth/account-service";

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

  const disconnectedId = await disconnectAccount(userId, body.accountId);

  if (!disconnectedId) {
    return NextResponse.json({ error: "account_not_found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, accountId: disconnectedId });
}
