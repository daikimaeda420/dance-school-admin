-- 講師 × コース
CREATE TABLE IF NOT EXISTS "DiagnosisInstructorCourse" (
  "instructorId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "DiagnosisInstructorCourse_pkey" PRIMARY KEY ("instructorId","courseId")
);

CREATE INDEX IF NOT EXISTS "DiagnosisInstructorCourse_schoolId_idx"
  ON "DiagnosisInstructorCourse" ("schoolId");

CREATE INDEX IF NOT EXISTS "DiagnosisInstructorCourse_courseId_idx"
  ON "DiagnosisInstructorCourse" ("courseId");

-- 講師 × ジャンル
CREATE TABLE IF NOT EXISTS "DiagnosisInstructorGenre" (
  "instructorId" TEXT NOT NULL,
  "genreId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "DiagnosisInstructorGenre_pkey" PRIMARY KEY ("instructorId","genreId")
);

CREATE INDEX IF NOT EXISTS "DiagnosisInstructorGenre_schoolId_idx"
  ON "DiagnosisInstructorGenre" ("schoolId");

CREATE INDEX IF NOT EXISTS "DiagnosisInstructorGenre_genreId_idx"
  ON "DiagnosisInstructorGenre" ("genreId");

-- 講師 × 校舎
CREATE TABLE IF NOT EXISTS "DiagnosisInstructorCampus" (
  "instructorId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "DiagnosisInstructorCampus_pkey" PRIMARY KEY ("instructorId","campusId")
);

CREATE INDEX IF NOT EXISTS "DiagnosisInstructorCampus_schoolId_idx"
  ON "DiagnosisInstructorCampus" ("schoolId");

CREATE INDEX IF NOT EXISTS "DiagnosisInstructorCampus_campusId_idx"
  ON "DiagnosisInstructorCampus" ("campusId");
