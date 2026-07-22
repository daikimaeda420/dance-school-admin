CREATE TABLE "AiImprovement" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "actionKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'APPLIED',
  "metricKey" TEXT,
  "baselineValue" DOUBLE PRECISION,
  "metadata" JSONB,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiImprovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiImprovement_schoolId_appliedAt_idx" ON "AiImprovement"("schoolId", "appliedAt");
CREATE INDEX "AiImprovement_schoolId_actionKey_idx" ON "AiImprovement"("schoolId", "actionKey");
