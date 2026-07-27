import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUserId } from "@/lib/oauth/current-user";
import { createMediaAsset } from "@/lib/media/media-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const userId = await getCurrentUserId();
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const batchId = (formData.get("batchId") as string) || undefined;
    const batchName = (formData.get("batchName") as string) || undefined;
    const relativePath = (formData.get("relativePath") as string) || file?.name || "file";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let blobUrl = "";

    // Try Vercel Blob put if token exists
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(relativePath, file, { access: "public" });
        blobUrl = blob.url;
      } catch (blobErr) {
        console.warn("[media/direct-upload] Vercel Blob put failed, falling back to data URL:", blobErr);
      }
    }

    // Fallback data URL if Vercel Blob token is unconfigured or failed
    if (!blobUrl) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      blobUrl = `data:${file.type || "application/octet-stream"};base64,${base64}`;
    }

    const asset = await createMediaAsset({
      userId: userId || "usr_primary",
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      blobUrl,
      batchId,
      batchName,
      relativePath,
    });

    return NextResponse.json({ success: true, asset });
  } catch (error) {
    console.error("[media/direct-upload] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
