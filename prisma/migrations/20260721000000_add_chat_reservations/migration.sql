ALTER TABLE "Faq"
  ADD COLUMN "chatMode" TEXT NOT NULL DEFAULT 'FAQ_ONLY',
  ADD COLUMN "reservationMode" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN "reservationUrl" TEXT;

CREATE TABLE "ChatReservation" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "sessionId" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "preferredDate" TEXT,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatReservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatReservation_schoolId_createdAt_idx" ON "ChatReservation"("schoolId", "createdAt");
CREATE INDEX "ChatReservation_schoolId_status_idx" ON "ChatReservation"("schoolId", "status");
