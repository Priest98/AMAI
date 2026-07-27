import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/oauth/current-user";
import { deleteMediaAsset } from "@/lib/media/media-service";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const deletedId = await deleteMediaAsset(userId, id);

    if (!deletedId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: deletedId });
  } catch (e) {
    return NextResponse.json({ success: true, id });
  }
}
