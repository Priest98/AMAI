import { randomBytes, createHmac, createHash, timingSafeEqual } from "crypto";
import { oauthEnv } from "./env";
import type { OAuthProviderName } from "./types";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface StatePayload {
  userId: string;
  provider: OAuthProviderName;
  nonce: string;
  issuedAt: number;
}

function sign(data: string): string {
  return createHmac("sha256", oauthEnv.stateSecret()).update(data).digest("base64url");
}

/**
 * Produces a signed, URL-safe `state` value: base64url(json).signature
 * Stateless — no DB/session lookup needed to verify it later, which keeps
 * the OAuth dance resilient across serverless function invocations.
 */
export function createSignedState(userId: string, provider: OAuthProviderName): string {
  const payload: StatePayload = {
    userId,
    provider,
    nonce: randomBytes(16).toString("hex"),
    issuedAt: Date.now(),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export interface VerifiedState {
  userId: string;
  provider: OAuthProviderName;
}

/**
 * Verifies signature, expiry, and (if provided) that the state was minted
 * for the expected provider. Throws on any failure — callers should catch
 * and surface a generic "invalid or expired request" error to the user.
 */
export function verifySignedState(
  state: string,
  expectedProvider: OAuthProviderName
): VerifiedState {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) {
    throw new Error("Malformed state parameter");
  }

  const expectedSignature = sign(encodedPayload);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("State signature mismatch");
  }

  const payload: StatePayload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString());

  if (Date.now() - payload.issuedAt > STATE_TTL_MS) {
    throw new Error("State parameter expired");
  }

  if (payload.provider !== expectedProvider) {
    throw new Error("State provider mismatch");
  }

  return { userId: payload.userId, provider: payload.provider };
}

// ---- PKCE (used by TikTok's v2 OAuth) ----

export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/** S256 method per RFC 7636: base64url(sha256(code_verifier)) */
export function generateCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}
