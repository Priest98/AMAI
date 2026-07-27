import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/oauth/current-user";
import { listMediaAssets } from "@/lib/media/media-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const batchId = req.nextUrl.searchParams.get("batchId") ?? undefined;
  try {
    const assets = await listMediaAssets(userId, { batchId });
    return NextResponse.json({ assets });
  } catch (e) {
    return NextResponse.json({ assets: [] });
  }
}
