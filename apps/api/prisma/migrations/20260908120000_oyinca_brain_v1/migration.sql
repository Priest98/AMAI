ALTER TABLE "BrainDecision"
  ADD COLUMN "confidence" DOUBLE PRECISION,
  ADD COLUMN "evaluation" JSONB,
  ADD COLUMN "evidence" JSONB,
  ADD COLUMN "postId" TEXT,
  ADD COLUMN "contentAnalysisId" TEXT;

CREATE TABLE "ContentAnalysis" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "mediaAssetId" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "fingerprint" TEXT NOT NULL,
  "analysis" JSONB NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "provider" TEXT,
  "model" TEXT,
  "latencyMs" INTEGER,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrainEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "postId" TEXT,
  "decisionId" TEXT,
  "payload" JSONB NOT NULL,
  "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrainEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearnedInsight" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "insightType" TEXT NOT NULL,
  "insight" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "evidenceCount" INTEGER NOT NULL DEFAULT 0,
  "contradictionCount" INTEGER NOT NULL DEFAULT 0,
  "authority" TEXT NOT NULL DEFAULT 'INFERRED',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "firstObservedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastObservedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastValidatedAt" TIMESTAMPTZ(6),
  "expiresAt" TIMESTAMPTZ(6),
  "supersededById" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearnedInsight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsightEvidence" (
  "id" TEXT NOT NULL,
  "insightId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InsightEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningRun" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "eventsConsidered" INTEGER NOT NULL DEFAULT 0,
  "insightsCreated" INTEGER NOT NULL DEFAULT 0,
  "insightsUpdated" INTEGER NOT NULL DEFAULT 0,
  "errorCode" TEXT,
  "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(6),
  CONSTRAINT "LearningRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentAnalysis_brandId_mediaAssetId_fingerprint_key" ON "ContentAnalysis"("brandId", "mediaAssetId", "fingerprint");
CREATE INDEX "idx_content_analysis_tenant_created" ON "ContentAnalysis"("organizationId", "brandId", "createdAt");
CREATE UNIQUE INDEX "BrainEvent_brandId_idempotencyKey_key" ON "BrainEvent"("brandId", "idempotencyKey");
CREATE INDEX "idx_brain_event_tenant_type_time" ON "BrainEvent"("organizationId", "brandId", "type", "occurredAt");
CREATE INDEX "idx_brain_event_post" ON "BrainEvent"("postId");
CREATE UNIQUE INDEX "LearnedInsight_brandId_key_key" ON "LearnedInsight"("brandId", "key");
CREATE INDEX "idx_learned_insight_tenant_active" ON "LearnedInsight"("organizationId", "brandId", "status", "confidence");
CREATE INDEX "idx_learned_insight_expiry" ON "LearnedInsight"("expiresAt");
CREATE UNIQUE INDEX "InsightEvidence_insightId_eventId_key" ON "InsightEvidence"("insightId", "eventId");
CREATE INDEX "idx_insight_evidence_event" ON "InsightEvidence"("eventId");
CREATE INDEX "idx_learning_run_tenant_started" ON "LearningRun"("organizationId", "brandId", "startedAt");
CREATE INDEX "idx_brain_decision_post" ON "BrainDecision"("postId");

ALTER TABLE "ContentAnalysis" ADD CONSTRAINT "ContentAnalysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "ContentAnalysis" ADD CONSTRAINT "ContentAnalysis_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "ContentAnalysis" ADD CONSTRAINT "ContentAnalysis_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "BrainEvent" ADD CONSTRAINT "BrainEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "BrainEvent" ADD CONSTRAINT "BrainEvent_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "BrainEvent" ADD CONSTRAINT "BrainEvent_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "BrainEvent" ADD CONSTRAINT "BrainEvent_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "BrainDecision"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "LearnedInsight" ADD CONSTRAINT "LearnedInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "LearnedInsight" ADD CONSTRAINT "LearnedInsight_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "InsightEvidence" ADD CONSTRAINT "InsightEvidence_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "LearnedInsight"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "InsightEvidence" ADD CONSTRAINT "InsightEvidence_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "BrainEvent"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "LearningRun" ADD CONSTRAINT "LearningRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "LearningRun" ADD CONSTRAINT "LearningRun_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "BrainDecision" ADD CONSTRAINT "BrainDecision_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "BrainDecision" ADD CONSTRAINT "BrainDecision_contentAnalysisId_fkey" FOREIGN KEY ("contentAnalysisId") REFERENCES "ContentAnalysis"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- These tables are internal server-side Brain storage. Supabase exposes the
-- public schema through its Data API depending on project settings, so keep
-- them inaccessible to anon/authenticated clients. The Nest API uses the
-- database service connection and enforces membership through BrandAccessGuard.
ALTER TABLE "ContentAnalysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrainEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearnedInsight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InsightEvidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearningRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketIntelligenceSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrainDecision" ENABLE ROW LEVEL SECURITY;
