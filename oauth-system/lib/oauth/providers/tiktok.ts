import { oauthEnv } from "../env";
import { generateCodeChallenge, generateCodeVerifier } from "../state";
import type {
  AuthorizationRequestResult,
  ExchangeCodeParams,
  OAuthProviderAdapter,
  ProviderAccountIdentity,
  TokenSet,
} from "../types";
import { OAuthError } from "../types";

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/";

interface TikTokTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
  refresh_expires_in?: number;
  scope: string;
  token_type: string;
  open_id: string;
  error?: string;
  error_description?: string;
}

interface TikTokUserInfoResponse {
  data?: {
    user?: {
      open_id: string;
      union_id?: string;
      display_name?: string;
      username?: string;
      avatar_url?: string;
    };
  };
  error?: { code: string; message: string };
}

export class TikTokProvider implements OAuthProviderAdapter {
  readonly name = "tiktok" as const;

  buildAuthorizationRequest(state: string): AuthorizationRequestResult {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      client_key: oauthEnv.tiktok.clientKey(),
      scope: oauthEnv.tiktok.scopes(),
      response_type: "code",
      redirect_uri: oauthEnv.tiktok.redirectUri(),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return {
      authorizationUrl: `${AUTHORIZE_URL}?${params.toString()}`,
      state,
      codeVerifier,
    };
  }

  async exchangeCodeForToken({ code, codeVerifier }: ExchangeCodeParams): Promise<TokenSet> {
    if (!codeVerifier) {
      throw new OAuthError(
        "Missing PKCE code_verifier for TikTok token exchange",
        "missing_code_verifier",
        "tiktok",
        400
      );
    }

    const body = new URLSearchParams({
      client_key: oauthEnv.tiktok.clientKey(),
      client_secret: oauthEnv.tiktok.clientSecret(),
      code,
      grant_type: "authorization_code",
      redirect_uri: oauthEnv.tiktok.redirectUri(),
      code_verifier: codeVerifier,
    });

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: body.toString(),
    });

    const json: TikTokTokenResponse = await res.json();

    if (!res.ok || json.error) {
      throw new OAuthError(
        json.error_description || "TikTok token exchange failed",
        json.error || "token_exchange_failed",
        "tiktok",
        res.status || 400,
        json
      );
    }

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      expiresAt: Date.now() + json.expires_in * 1000,
      scopes: json.scope ? json.scope.split(",") : [],
    };
  }

  async fetchAccountIdentity(tokens: TokenSet): Promise<ProviderAccountIdentity> {
    const fields = ["open_id", "union_id", "display_name", "username", "avatar_url"].join(",");
    const res = await fetch(`${USERINFO_URL}?fields=${fields}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    const json: TikTokUserInfoResponse = await res.json();

    if (!res.ok || json.error || !json.data?.user) {
      throw new OAuthError(
        json.error?.message || "Failed to fetch TikTok account identity",
        json.error?.code || "identity_fetch_failed",
        "tiktok",
        res.status || 400,
        json
      );
    }

    const user = json.data.user;

    return {
      providerAccountId: user.open_id,
      username: user.username ?? null,
      displayName: user.display_name ?? null,
      avatarUrl: user.avatar_url ?? null,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenSet | null> {
    const body = new URLSearchParams({
      client_key: oauthEnv.tiktok.clientKey(),
      client_secret: oauthEnv.tiktok.clientSecret(),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: body.toString(),
    });

    const json: TikTokTokenResponse = await res.json();

    if (!res.ok || json.error) {
      throw new OAuthError(
        json.error_description || "TikTok token refresh failed",
        json.error || "token_refresh_failed",
        "tiktok",
        res.status || 400,
        json
      );
    }

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? refreshToken,
      expiresAt: Date.now() + json.expires_in * 1000,
      scopes: json.scope ? json.scope.split(",") : [],
    };
  }
}
