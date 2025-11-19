-- AlterTable
ALTER TABLE "Faq" ADD COLUMN     "ctaLabel" TEXT,
ADD COLUMN     "ctaUrl" TEXT,
ADD COLUMN     "palette" TEXT NOT NULL DEFAULT 'gray';

-- CreateTable
CREATE TABLE "FaqLog" (
    "id" SERIAL NOT NULL,
    "school" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaqLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaqLog_school_idx" ON "FaqLog"("school");

-- CreateIndex
CREATE INDEX "FaqLog_sessionId_idx" ON "FaqLog"("sessionId");

-- CreateIndex
CREATE INDEX "FaqLog_timestamp_idx" ON "FaqLog"("timestamp");
