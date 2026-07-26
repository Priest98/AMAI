import { NextRequest } from "next/server";
import { handleOAuthCallback } from "@/lib/oauth/callback-handler";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleOAuthCallback(req, "instagram");
}
