import { oauthEnv } from "../env";
import type {
  AuthorizationRequestResult,
  ExchangeCodeParams,
  OAuthProviderAdapter,
  ProviderAccountIdentity,
  TokenSet,
} from "../types";
import { OAuthError } from "../types";

/**
 * Instagram professional accounts are connected via Facebook Login +
 * the Instagram Graph API (the old Instagram Basic Display API was
 * deprecated). This adapter authenticates against Facebook, then
 * resolves the linked Instagram Business/Creator account.
 */
function graphBase() {
  return `https://graph.facebook.com/${oauthEnv.instagram.graphApiVersion()}`;
}

interface FbTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  error?: { message: string; type: string; code: number };
}

interface FbPagesResponse {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: { id: string };
  }>;
  error?: { message: string; code: number };
}

interface IgAccountResponse {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  error?: { message: string; code: number };
}

export class InstagramProvider implements OAuthProviderAdapter {
  readonly name = "instagram" as const;

  buildAuthorizationRequest(state: string): AuthorizationRequestResult {
    const params = new URLSearchParams({
      client_id: oauthEnv.instagram.clientId(),
      redirect_uri: oauthEnv.instagram.redirectUri(),
      state,
      scope: oauthEnv.instagram.scopes(),
      response_type: "code",
    });

    return {
      authorizationUrl: `https://www.facebook.com/${oauthEnv.instagram.graphApiVersion()}/dialog/oauth?${params.toString()}`,
      state,
    };
  }

  async exchangeCodeForToken({ code }: ExchangeCodeParams): Promise<TokenSet> {
    // Step 1: exchange the authorization code for a short-lived user token.
    const shortLivedParams = new URLSearchParams({
      client_id: oauthEnv.instagram.clientId(),
      client_secret: oauthEnv.instagram.clientSecret(),
      redirect_uri: oauthEnv.instagram.redirectUri(),
      code,
    });

    const shortRes = await fetch(`${graphBase()}/oauth/access_token?${shortLivedParams}`);
    const shortJson: FbTokenResponse = await shortRes.json();

    if (!shortRes.ok || shortJson.error) {
      throw new OAuthError(
        shortJson.error?.message || "Instagram/Facebook code exchange failed",
        String(shortJson.error?.code ?? "code_exchange_failed"),
        "instagram",
        shortRes.status || 400,
        shortJson
      );
    }

    // Step 2: exchange the short-lived token for a long-lived one (~60 days).
    const longLivedParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: oauthEnv.instagram.clientId(),
      client_secret: oauthEnv.instagram.clientSecret(),
      fb_exchange_token: shortJson.access_token,
    });

    const longRes = await fetch(`${graphBase()}/oauth/access_token?${longLivedParams}`);
    const longJson: FbTokenResponse = await longRes.json();

    if (!longRes.ok || longJson.error) {
      throw new OAuthError(
        longJson.error?.message || "Instagram/Facebook long-lived token exchange failed",
        String(longJson.error?.code ?? "long_lived_exchange_failed"),
        "instagram",
        longRes.status || 400,
        longJson
      );
    }

    return {
      accessToken: longJson.access_token,
      // Meta doesn't issue a separate refresh token; the long-lived token
      // itself gets refreshed by re-running the fb_exchange_token flow
      // (see refreshToken below) before it expires.
      refreshToken: null,
      expiresAt: longJson.expires_in ? Date.now() + longJson.expires_in * 1000 : null,
      scopes: oauthEnv.instagram.scopes().split(","),
    };
  }

  async fetchAccountIdentity(tokens: TokenSet): Promise<ProviderAccountIdentity> {
    // Find the Facebook Page the user manages, then its linked IG business account.
    const pagesRes = await fetch(
      `${graphBase()}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${tokens.accessToken}`
    );
    const pagesJson: FbPagesResponse = await pagesRes.json();

    if (!pagesRes.ok || pagesJson.error) {
      throw new OAuthError(
        pagesJson.error?.message || "Failed to list Facebook Pages",
        String(pagesJson.error?.code ?? "pages_fetch_failed"),
        "instagram",
        pagesRes.status || 400,
        pagesJson
      );
    }

    const pageWithIg = pagesJson.data?.find((p) => p.instagram_business_account?.id);

    if (!pageWithIg?.instagram_business_account) {
      throw new OAuthError(
        "No Instagram professional account is linked to any of this user's Facebook Pages",
        "no_linked_instagram_account",
        "instagram",
        409
      );
    }

    const igId = pageWithIg.instagram_business_account.id;

    const igRes = await fetch(
      `${graphBase()}/${igId}?fields=id,username,name,profile_picture_url&access_token=${tokens.accessToken}`
    );
    const igJson: IgAccountResponse = await igRes.json();

    if (!igRes.ok || igJson.error) {
      throw new OAuthError(
        igJson.error?.message || "Failed to fetch Instagram account details",
        String(igJson.error?.code ?? "ig_account_fetch_failed"),
        "instagram",
        igRes.status || 400,
        igJson
      );
    }

    return {
      providerAccountId: igJson.id,
      username: igJson.username ?? null,
      displayName: igJson.name ?? null,
      avatarUrl: igJson.profile_picture_url ?? null,
    };
  }

  /**
   * Meta has no refresh_token grant. Instead, a still-valid long-lived
   * token can be exchanged for a fresh 60-day token. Pass the current
   * access token in place of a refresh token when calling this.
   */
  async refreshToken(currentAccessToken: string): Promise<TokenSet | null> {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: oauthEnv.instagram.clientId(),
      client_secret: oauthEnv.instagram.clientSecret(),
      fb_exchange_token: currentAccessToken,
    });

    const res = await fetch(`${graphBase()}/oauth/access_token?${params}`);
    const json: FbTokenResponse = await res.json();

    if (!res.ok || json.error) {
      throw new OAuthError(
        json.error?.message || "Instagram token refresh failed",
        String(json.error?.code ?? "token_refresh_failed"),
        "instagram",
        res.status || 400,
        json
      );
    }

    return {
      accessToken: json.access_token,
      refreshToken: null,
      expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : null,
      scopes: oauthEnv.instagram.scopes().split(","),
    };
  }
}
