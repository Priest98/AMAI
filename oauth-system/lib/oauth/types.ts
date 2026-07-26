export type OAuthProviderName = "instagram" | "tiktok";

export type ConnectionStatus = "connected" | "disconnected" | "error" | "expired";

export interface TokenSet {
  accessToken: string;
  refreshToken?: string | null;
  /** Unix ms timestamp, or null if the provider issues non-expiring tokens */
  expiresAt: number | null;
  scopes: string[];
}

export interface ProviderAccountIdentity {
  providerAccountId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface AuthorizationRequestResult {
  authorizationUrl: string;
  state: string;
  /** Only set for providers that use PKCE (e.g. TikTok) */
  codeVerifier?: string;
}

export interface ExchangeCodeParams {
  code: string;
  codeVerifier?: string;
}

/**
 * Every provider adapter implements this interface. Adding a new platform
 * (Facebook Pages, LinkedIn, YouTube, Pinterest, X) means writing one class
 * that satisfies this contract and registering it in the provider registry.
 */
export interface OAuthProviderAdapter {
  readonly name: OAuthProviderName;

  buildAuthorizationRequest(state: string): AuthorizationRequestResult;

  exchangeCodeForToken(params: ExchangeCodeParams): Promise<TokenSet>;

  fetchAccountIdentity(tokens: TokenSet): Promise<ProviderAccountIdentity>;

  /** Returns null if the provider doesn't support refresh (e.g. long-lived-only tokens) */
  refreshToken(refreshToken: string): Promise<TokenSet | null>;
}

export class OAuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider: OAuthProviderName,
    public readonly httpStatus = 400,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "OAuthError";
  }
}
