ALTER TABLE "MediaAsset"
  ADD COLUMN "aiReservationOrgId" TEXT,
  ADD COLUMN "aiReservationPeriodStart" TIMESTAMPTZ(6),
  ADD COLUMN "optimizationAttempts" INTEGER NOT NULL DEFAULT 0;
