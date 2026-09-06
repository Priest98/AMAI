CREATE TABLE "MarketIntelligenceSnapshot" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "timeWindow" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sourceSummary" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "generatedAt" TIMESTAMPTZ(6) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketIntelligenceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketIntelligenceSnapshot_organizationId_brandId_provider_queryHash_key"
ON "MarketIntelligenceSnapshot"("organizationId", "brandId", "provider", "queryHash");

CREATE INDEX "idx_market_intelligence_lookup"
ON "MarketIntelligenceSnapshot"("organizationId", "brandId", "queryHash", "expiresAt");

CREATE INDEX "idx_market_intelligence_brand_generated"
ON "MarketIntelligenceSnapshot"("brandId", "generatedAt");

ALTER TABLE "MarketIntelligenceSnapshot"
ADD CONSTRAINT "MarketIntelligenceSnapshot_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "MarketIntelligenceSnapshot"
ADD CONSTRAINT "MarketIntelligenceSnapshot_brandId_fkey"
FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

