CREATE TABLE "BrainDecision" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reasonCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "skillsUsed" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "providersUsed" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "model" TEXT,
    "contextSections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "latencyMs" INTEGER NOT NULL,
    "tokensUsed" INTEGER,
    "estimatedCostUsd" DOUBLE PRECISION,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrainDecision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BrainDecision_correlationId_key" ON "BrainDecision"("correlationId");
CREATE INDEX "idx_brain_decision_org_created" ON "BrainDecision"("organizationId", "createdAt");
CREATE INDEX "idx_brain_decision_brand_created" ON "BrainDecision"("brandId", "createdAt");
CREATE INDEX "idx_brain_decision_outcome_created" ON "BrainDecision"("outcome", "createdAt");
ALTER TABLE "BrainDecision" ADD CONSTRAINT "BrainDecision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "BrainDecision" ADD CONSTRAINT "BrainDecision_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

