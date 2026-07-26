import type { OAuthProviderAdapter, OAuthProviderName } from "../types";
import { InstagramProvider } from "./instagram";
import { TikTokProvider } from "./tiktok";

/**
 * Single source of truth for which providers exist. Adding a new platform
 * (Facebook Pages, LinkedIn, YouTube, Pinterest, X) means:
 *   1. Write a new adapter class implementing OAuthProviderAdapter.
 *   2. Register it here.
 *   3. Add its config block to lib/oauth/env.ts.
 * No other file needs to change.
 */
const registry: Record<OAuthProviderName, OAuthProviderAdapter> = {
  instagram: new InstagramProvider(),
  tiktok: new TikTokProvider(),
};

export function getProvider(name: OAuthProviderName): OAuthProviderAdapter {
  const provider = registry[name];
  if (!provider) {
    throw new Error(`[oauth] Unknown provider: ${name}`);
  }
  return provider;
}

export function isValidProviderName(name: string): name is OAuthProviderName {
  return name in registry;
}
