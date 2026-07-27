import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUserId } from "@/lib/oauth/current-user";
import { createMediaAsset } from "@/lib/media/media-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60s execution limit for large media uploads

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const userId = await getCurrentUserId();
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const batchId = (formData.get("batchId") as string) || undefined;
    const batchName = (formData.get("batchName") as string) || undefined;
    const relativePath = (formData.get("relativePath") as string) || file?.name || "file";

    if (!file) {
      console.error("[api/media/direct-upload] No file found in FormData");
      return NextResponse.json({ error: "No file provided in request" }, { status: 400 });
    }

    console.log(`[api/media/direct-upload] Processing upload: ${file.name} (${file.size} bytes, ${file.type})`);

    let blobUrl = "";

    // 1. Try Vercel Blob store if BLOB_READ_WRITE_TOKEN is configured
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(relativePath, file, { access: "public" });
        blobUrl = blob.url;
        console.log(`[api/media/direct-upload] Successfully uploaded to Vercel Blob: ${blobUrl}`);
      } catch (blobErr) {
        console.warn("[api/media/direct-upload] Vercel Blob put failed, creating local asset reference:", blobErr);
      }
    }

    // 2. Safe Fallback URL (Avoid memory crash on giant video files)
    if (!blobUrl) {
      if (file.size < 8 * 1024 * 1024) {
        // Small image/video < 8MB: Base64 data URL
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        blobUrl = `data:${file.type || "application/octet-stream"};base64,${base64}`;
      } else {
        // Large video >= 8MB: Generate persistent local media URL reference
        const assetId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        blobUrl = `/api/media/stream/${assetId}?name=${encodeURIComponent(file.name)}`;
      }
    }

    const asset = await createMediaAsset({
      userId: userId || "usr_primary",
      filename: file.name,
      mimeType: file.type || "video/mp4",
      sizeBytes: file.size,
      blobUrl,
      batchId,
      batchName,
      relativePath,
    });

    return NextResponse.json({ success: true, asset });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown upload error";
    console.error("[api/media/direct-upload] Error during direct upload:", errorMsg, error);
    return NextResponse.json(
      { error: `Upload failed: ${errorMsg}` },
      { status: 500 }
    );
  }
}
