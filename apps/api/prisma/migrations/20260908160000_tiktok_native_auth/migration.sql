ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

ALTER TABLE "SocialAccount" ADD COLUMN "grantedScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "AuthIdentity" (
  "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "providerUnionId" TEXT,
  "profile" JSONB,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "AuthIdentity_provider_providerAccountId_key" ON "AuthIdentity"("provider", "providerAccountId");
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");

CREATE TABLE "OAuthTransaction" (
  "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "stateHash" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "intent" TEXT NOT NULL,
  "userId" TEXT,
  "brandId" TEXT,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "consumedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OAuthTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "OAuthTransaction_stateHash_key" ON "OAuthTransaction"("stateHash");
CREATE INDEX "OAuthTransaction_provider_expiresAt_idx" ON "OAuthTransaction"("provider", "expiresAt");

ALTER TABLE "AuthIdentity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OAuthTransaction" ENABLE ROW LEVEL SECURITY;
