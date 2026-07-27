import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/oauth/current-user";
import { createMediaAsset } from "@/lib/media/media-service";

export const dynamic = "force-dynamic";

interface ClientPayload {
  batchId?: string;
  batchName?: string;
  relativePath?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async (pathname, clientPayloadRaw) => {
        const userId = await getCurrentUserId();
        if (!userId) {
          throw new Error("unauthorized");
        }

        return {
          allowedContentTypes: [
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "image/jpeg",
            "image/png",
            "image/webp",
          ],
          maximumSizeInBytes: 500 * 1024 * 1024,
          tokenPayload: JSON.stringify({ userId, pathname, ...JSON.parse(clientPayloadRaw ?? "{}") }),
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload ?? "{}") as {
          userId: string;
          pathname: string;
        } & ClientPayload;

        await createMediaAsset({
          userId: payload.userId,
          filename: payload.pathname.split("/").pop() ?? payload.pathname,
          mimeType: blob.contentType ?? "application/octet-stream",
          sizeBytes: 0,
          blobUrl: blob.url,
          batchId: payload.batchId,
          batchName: payload.batchName,
          relativePath: payload.relativePath,
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
