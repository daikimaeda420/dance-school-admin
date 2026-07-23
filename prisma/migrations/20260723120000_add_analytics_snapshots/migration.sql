CREATE TABLE "AnalyticsSnapshot" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "periodDays" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnalyticsSnapshot_schoolId_kind_periodDays_key"
  ON "AnalyticsSnapshot"("schoolId", "kind", "periodDays");
CREATE INDEX "AnalyticsSnapshot_schoolId_kind_updatedAt_idx"
  ON "AnalyticsSnapshot"("schoolId", "kind", "updatedAt");
