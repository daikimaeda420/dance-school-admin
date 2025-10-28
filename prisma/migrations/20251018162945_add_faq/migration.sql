-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Faq_schoolId_key" ON "Faq"("schoolId");
