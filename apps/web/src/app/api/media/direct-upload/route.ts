import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUserId } from "@/lib/oauth/current-user";
import { createMediaAsset } from "@/lib/media/media-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NICHE_HASHTAGS: Record<string, string[]> = {
  'Fashion Designer': ['#FashionDesign', '#OOTD', '#StyleInspo', '#Couture', '#GarmentDetails'],
  'Restaurant': ['#Foodie', '#EatLocal', '#Gourmet', '#RestaurantLife', '#FoodGasm'],
  'Real Estate': ['#RealEstate', '#DreamHome', '#PropertyListing', '#LuxuryRealty'],
  'Beauty': ['#BeautyTips', '#SkinCareRoutine', '#GlowUp', '#Cosmetics'],
  'Fitness': ['#FitnessMotivation', '#Workout', '#FitLife', '#ActiveWear'],
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const userId = (await getCurrentUserId()) || "usr_primary";
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const batchId = (formData.get("batchId") as string) || undefined;
    const batchName = (formData.get("batchName") as string) || undefined;
    const relativePath = (formData.get("relativePath") as string) || file?.name || "file";

    if (!file) {
      console.error("[api/media/direct-upload] No file provided");
      return NextResponse.json({ error: "No file provided in upload request" }, { status: 400 });
    }

    console.log(`[api/media/direct-upload] File received: ${file.name} (${file.size} bytes)`);

    let blobUrl = "";

    // 1. Vercel Blob Put (if token available)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(relativePath, file, { access: "public" });
        blobUrl = blob.url;
      } catch (blobErr) {
        console.warn("[api/media/direct-upload] Vercel Blob put failed, generating local fallback URL", blobErr);
      }
    }

    // 2. Fallback Data URL or Stream reference
    if (!blobUrl) {
      if (file.size < 8 * 1024 * 1024) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        blobUrl = `data:${file.type || "image/jpeg"};base64,${base64}`;
      } else {
        const assetId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        blobUrl = `/api/media/stream/${assetId}?name=${encodeURIComponent(file.name)}`;
      }
    }

    const asset = await createMediaAsset({
      userId,
      filename: file.name,
      mimeType: file.type || "image/jpeg",
      sizeBytes: file.size,
      blobUrl,
      batchId,
      batchName,
      relativePath,
    });

    // 3. Automated Content Pipeline Trigger
    const defaultNiche = "Fashion Designer";
    const tags = (NICHE_HASHTAGS[defaultNiche] || NICHE_HASHTAGS['Fashion Designer']).join(' ');
    const generatedCaption = `✨ Fresh look: Showcase for ${file.name.replace(/\.[^/.]+$/, "")}! Crafted specially for our ${defaultNiche} community. What do you think of this piece? ${tags}`;

    const autoPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      caption: generatedCaption,
      platform: "INSTAGRAM, TIKTOK",
      mediaUrl: blobUrl,
      filename: file.name,
      status: "PENDING_APPROVAL",
      createdAt: new Date().toISOString(),
      scheduledTime: "Today, 7:45 PM EST",
    };

    return NextResponse.json({
      success: true,
      asset,
      autoPost,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error during media upload";
    console.error("[api/media/direct-upload] Upload exception:", errorMsg);
    return NextResponse.json(
      { error: `Upload failed: ${errorMsg}` },
      { status: 500 }
    );
  }
}
