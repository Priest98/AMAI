/**
 * Centralized, validated environment configuration for the OAuth subsystem.
 * Throws at startup (module load) if anything required is missing/malformed,
 * so misconfiguration fails fast instead of at request time.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`[oauth/env] Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

function requiredHexKey(name: string, byteLength: number): Buffer {
  const value = required(name);
  const buf = Buffer.from(value, "hex");
  if (buf.length !== byteLength) {
    throw new Error(
      `[oauth/env] ${name} must be a ${byteLength}-byte value encoded as hex ` +
        `(${byteLength * 2} hex characters). Got ${buf.length} bytes.`
    );
  }
  return buf;
}

export const oauthEnv = {
  appUrl: required("NEXT_PUBLIC_APP_URL"), // e.g. https://marketing-os-eight-virid.vercel.app

  // AES-256-GCM key used to encrypt tokens at rest. Generate with:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  get encryptionKey() {
    return requiredHexKey("OAUTH_ENCRYPTION_KEY", 32);
  },

  // HMAC secret used to sign/verify the OAuth `state` param (CSRF protection).
  stateSecret: () => required("OAUTH_STATE_SECRET"),

  instagram: {
    clientId: () => required("INSTAGRAM_CLIENT_ID"), // Meta App ID
    clientSecret: () => required("INSTAGRAM_CLIENT_SECRET"), // Meta App Secret
    redirectUri: () =>
      optional(
        "INSTAGRAM_REDIRECT_URI",
        `${required("NEXT_PUBLIC_APP_URL")}/api/oauth/instagram/callback`
      ),
    graphApiVersion: () => optional("META_GRAPH_API_VERSION", "v21.0"),
    scopes: () =>
      optional(
        "INSTAGRAM_SCOPES",
        "instagram_basic,instagram_manage_comments,instagram_manage_insights,pages_show_list,business_management"
      ),
  },

  tiktok: {
    clientKey: () => required("TIKTOK_CLIENT_KEY"),
    clientSecret: () => required("TIKTOK_CLIENT_SECRET"),
    redirectUri: () =>
      optional(
        "TIKTOK_REDIRECT_URI",
        `${required("NEXT_PUBLIC_APP_URL")}/api/oauth/tiktok/callback`
      ),
    scopes: () => optional("TIKTOK_SCOPES", "user.info.basic,video.publish,video.upload"),
  },
};
