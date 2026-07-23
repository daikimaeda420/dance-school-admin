CREATE TABLE "RevenueSimulationSettings" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "expectedEnrollmentRate" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "enrollmentFee" INTEGER NOT NULL DEFAULT 0,
    "monthlyFee" INTEGER NOT NULL DEFAULT 0,
    "otherFees" INTEGER NOT NULL DEFAULT 0,
    "averageRetentionMonths" INTEGER NOT NULL DEFAULT 6,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueSimulationSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RevenueSimulationSettings_schoolId_key" ON "RevenueSimulationSettings"("schoolId");
