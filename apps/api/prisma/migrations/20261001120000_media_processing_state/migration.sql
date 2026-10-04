ALTER TABLE "MediaAsset"
  ADD COLUMN "processingIntent" TEXT NOT NULL DEFAULT 'SINGLE',
  ADD COLUMN "processingStage" TEXT NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN "processingAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "optimizationStage" TEXT NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN "processingNextAttemptAt" TIMESTAMPTZ(6);
CREATE INDEX "MediaAsset_processingIntent_status_processingNextAttemptAt_idx"
  ON "MediaAsset"("processingIntent", "status", "processingNextAttemptAt");
-- Existing pending uploads have ambiguous intent: do not automatically
-- create individual posts from a previously staged carousel.
UPDATE "MediaAsset" SET "processingIntent" = 'STAGED'
WHERE "status" = 'PENDING' AND "linkedPostId" IS NULL;
