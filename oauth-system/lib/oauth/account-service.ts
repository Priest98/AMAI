import { PrismaClient, OAuthProvider as PrismaOAuthProvider } from "@prisma/client";
import { decryptTokenOrNull, encryptToken, encryptTokenOrNull } from "./encryption";
import { getProvider } from "./providers/registry";
import type { OAuthProviderName, ProviderAccountIdentity, TokenSet } from "./types";

// Reuse a single Prisma client across serverless invocations.
// If your project already exports one from lib/prisma.ts, import that
// instead of instantiating a second client here.
const prisma = new PrismaClient();

function toPrismaProvider(name: OAuthProviderName): PrismaOAuthProvider {
  return name.toUpperCase() as PrismaOAuthProvider;
}

/**
 * Persists (or updates) a connected account after a successful OAuth
 * exchange. Tokens are encrypted before hitting the database.
 */
export async function upsertConnectedAccount(
  userId: string,
  providerName: OAuthProviderName,
  identity: ProviderAccountIdentity,
  tokens: TokenSet
) {
  return prisma.connectedAccount.upsert({
    where: {
      userId_provider_providerAccountId: {
        userId,
        provider: toPrismaProvider(providerName),
        providerAccountId: identity.providerAccountId,
      },
    },
    create: {
      userId,
      provider: toPrismaProvider(providerName),
      providerAccountId: identity.providerAccountId,
      username: identity.username ?? null,
      displayName: identity.displayName ?? null,
      avatarUrl: identity.avatarUrl ?? null,
      accessTokenEncrypted: encryptToken(tokens.accessToken),
      refreshTokenEncrypted: encryptTokenOrNull(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : null,
      scopes: tokens.scopes,
      status: "CONNECTED",
      lastErrorMessage: null,
    },
    update: {
      username: identity.username ?? null,
      displayName: identity.displayName ?? null,
      avatarUrl: identity.avatarUrl ?? null,
      accessTokenEncrypted: encryptToken(tokens.accessToken),
      refreshTokenEncrypted: encryptTokenOrNull(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : null,
      scopes: tokens.scopes,
      status: "CONNECTED",
      lastErrorMessage: null,
    },
  });
}

export async function listConnectedAccounts(userId: string) {
  const rows = await prisma.connectedAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  // Never return decrypted tokens to a status endpoint — this is
  // explicitly the safe, frontend-facing shape.
  return rows.map((row) => ({
    id: row.id,
    provider: row.provider.toLowerCase() as OAuthProviderName,
    providerAccountId: row.providerAccountId,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    status: row.status,
    scopes: row.scopes,
    tokenExpiresAt: row.tokenExpiresAt,
    lastErrorMessage: row.lastErrorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function disconnectAccount(userId: string, accountId: string) {
  const account = await prisma.connectedAccount.findFirst({
    where: { id: accountId, userId },
  });

  if (!account) {
    return null;
  }

  await prisma.connectedAccount.update({
    where: { id: account.id },
    data: {
      status: "DISCONNECTED",
      accessTokenEncrypted: "", // scrub tokens on disconnect
      refreshTokenEncrypted: null,
    },
  });

  return account.id;
}

export async function markAccountError(accountId: string, message: string) {
  await prisma.connectedAccount.update({
    where: { id: accountId },
    data: { status: "ERROR", lastErrorMessage: message },
  });
}

/**
 * Refreshes a single connected account's token if it's expired or close
 * to expiring, persisting the new (encrypted) token set. Returns the
 * account with a decrypted, ready-to-use access token — this is the only
 * place in the codebase that should ever hold a plaintext token.
 */
export async function getValidAccessToken(userId: string, accountId: string) {
  const account = await prisma.connectedAccount.findFirst({
    where: { id: accountId, userId },
  });

  if (!account || account.status === "DISCONNECTED") {
    return null;
  }

  const providerName = account.provider.toLowerCase() as OAuthProviderName;
  const provider = getProvider(providerName);

  const isExpiringSoon =
    account.tokenExpiresAt && account.tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if (!isExpiringSoon) {
    return decryptTokenOrNull(account.accessTokenEncrypted);
  }

  try {
    // Instagram has no refresh_token grant — it re-exchanges the current
    // access token instead. TikTok uses a real refresh_token.
    const refreshInput =
      providerName === "instagram"
        ? decryptTokenOrNull(account.accessTokenEncrypted)
        : decryptTokenOrNull(account.refreshTokenEncrypted);

    if (!refreshInput) {
      await markAccountError(account.id, "No refresh credential available");
      return null;
    }

    const refreshed = await provider.refreshToken(refreshInput);

    if (!refreshed) {
      await markAccountError(account.id, "Provider does not support refresh");
      return decryptTokenOrNull(account.accessTokenEncrypted); // fall back to existing token
    }

    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: {
        accessTokenEncrypted: encryptToken(refreshed.accessToken),
        refreshTokenEncrypted: encryptTokenOrNull(refreshed.refreshToken),
        tokenExpiresAt: refreshed.expiresAt ? new Date(refreshed.expiresAt) : null,
        status: "CONNECTED",
        lastErrorMessage: null,
      },
    });

    return refreshed.accessToken;
  } catch (err) {
    await markAccountError(account.id, err instanceof Error ? err.message : "Refresh failed");
    return null;
  }
}
