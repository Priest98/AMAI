import { NextRequest, NextResponse } from "next/server";
import { upsertConnectedAccount } from "./account-service";
import { getProvider } from "./providers/registry";
import { verifySignedState } from "./state";
import type { OAuthProviderName } from "./types";
import { OAuthError } from "./types";

const DASHBOARD_URL = "/dashboard/connections"; // adjust to your app's route

function redirectWithStatus(req: NextRequest, status: "success" | "error", detail?: string) {
  const url = new URL(DASHBOARD_URL, req.nextUrl.origin);
  url.searchParams.set("connection_status", status);
  if (detail) url.searchParams.set("detail", detail);
  return NextResponse.redirect(url);
}

export async function handleOAuthCallback(
  req: NextRequest,
  providerName: OAuthProviderName,
  opts?: { codeVerifier?: string; clearCookie?: (res: NextResponse) => void }
) {
  const searchParams = req.nextUrl.searchParams;
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description") || searchParams.get("error_reason");

  // The user denied permission, or the provider bounced back an error.
  if (error) {
    return redirectWithStatus(req, "error", errorDescription || error);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return redirectWithStatus(req, "error", "missing_code_or_state");
  }

  let verified;
  try {
    verified = verifySignedState(state, providerName);
  } catch {
    return redirectWithStatus(req, "error", "invalid_or_expired_state");
  }

  try {
    const provider = getProvider(providerName);
    const tokens = await provider.exchangeCodeForToken({ code, codeVerifier: opts?.codeVerifier });
    const identity = await provider.fetchAccountIdentity(tokens);

    await upsertConnectedAccount(verified.userId, providerName, identity, tokens);

    const res = redirectWithStatus(req, "success");
    opts?.clearCookie?.(res);
    return res;
  } catch (err) {
    const message =
      err instanceof OAuthError ? err.message : "Unexpected error completing connection";

    // Log server-side with full detail; never leak internals to the client redirect.
    console.error(`[oauth/${providerName}] callback failed:`, err);

    const res = redirectWithStatus(req, "error", message);
    opts?.clearCookie?.(res);
    return res;
  }
}
