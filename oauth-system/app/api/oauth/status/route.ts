import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/oauth/current-user";
import { listConnectedAccounts } from "@/lib/oauth/account-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const accounts = await listConnectedAccounts(userId);

  return NextResponse.json({ accounts });
}
