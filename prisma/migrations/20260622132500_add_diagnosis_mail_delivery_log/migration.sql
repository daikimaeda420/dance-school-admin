CREATE TABLE "DiagnosisMailDeliveryLog" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "submissionId" TEXT,
  "messageType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "fromEmail" TEXT,
  "toEmail" TEXT,
  "ccEmail" TEXT,
  "bccEmail" TEXT,
  "replyTo" TEXT,
  "subject" TEXT,
  "messageId" TEXT,
  "accepted" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "rejected" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "response" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DiagnosisMailDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DiagnosisMailDeliveryLog_schoolId_createdAt_idx" ON "DiagnosisMailDeliveryLog"("schoolId", "createdAt");
CREATE INDEX "DiagnosisMailDeliveryLog_submissionId_idx" ON "DiagnosisMailDeliveryLog"("submissionId");
CREATE INDEX "DiagnosisMailDeliveryLog_status_idx" ON "DiagnosisMailDeliveryLog"("status");
