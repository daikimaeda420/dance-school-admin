// app/api/diagnosis/result/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  QUESTIONS,
  concernMessages,
  ConcernMessageKey,
} from "@/lib/diagnosis/config";
import {
  CONCERN_RESULT_COPY,
  LEVEL_RESULT_COPY,
  AGE_RESULT_COPY,
  TEACHER_RESULT_COPY,
} from "@/lib/diagnosis/resultCopy";

type DiagnosisRequestBody = {
  schoolId?: string;
  answers?: Record<string, string>;
};

const REQUIRED_QUESTION_IDS = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"] as const;

// =========================
// Q6 helpers (Old Q5)
// =========================
function getConcernKey(answers: Record<string, string>): ConcernMessageKey {
  const q6 = QUESTIONS.find((q) => q.id === "Q6");
  const optionId = answers["Q6"];
  const opt = q6?.options.find((o) => o.id === optionId);
  const key = (opt as any)?.messageKey ?? "Msg_Consult";
  return key as ConcernMessageKey;
}

function getConcernOptionId(answers: Record<string, string>): string | null {
  const optionId = answers["Q6"];
  return typeof optionId === "string" && optionId.trim()
    ? optionId.trim()
    : null;
}

// =========================
// 共通 helpers
// =========================
function getOptionTagFromAnswers(
  questionId: string,
  answers: Record<string, string>,
): string | null {
  const q = QUESTIONS.find((q) => q.id === questionId);
  const optionId = answers[questionId];
  const opt = q?.options.find((o: any) => o.id === optionId) as any;
  const tag = opt?.tag;
  return typeof tag === "string" && tag.trim() ? tag.trim() : null;
}



function norm(s: unknown): string {
  return String(s ?? "").trim();
}

function getQ2ValueForCourse(answers: Record<string, string>): string {
  const raw = answers["Q2"];
  const q2 = QUESTIONS.find((q) => q.id === "Q2");
  const opt: any = q2?.options?.find((o: any) => o.id === raw);
  return norm(opt?.label ?? opt?.value ?? opt?.tag ?? raw);
}

// =========================
// instructor filtering helpers
// =========================
function intersectIds(a: string[], b: string[]): string[] {
  const bSet = new Set(b);
  return a.filter((x) => bSet.has(x));
}

async function instructorIdsByCampus(params: {
  schoolId: string;
  campusId: string;
}) {
  const rows = await prisma.diagnosisInstructorCampus.findMany({
    where: { schoolId: params.schoolId, campusId: params.campusId },
    select: { instructorId: true },
  });
  return rows.map((r) => r.instructorId);
}

async function instructorIdsByCourse(params: {
  schoolId: string;
  courseId: string;
}) {
  const rows = await prisma.diagnosisInstructorCourse.findMany({
    where: { schoolId: params.schoolId, courseId: params.courseId },
    select: { instructorId: true },
  });
  return rows.map((r) => r.instructorId);
}

async function instructorIdsByConcernOption(params: {
  schoolId: string;
  optionId: string;
}) {
  const rows = await prisma.diagnosisInstructorQ6Option.findMany({
    where: {
      schoolId: params.schoolId,
      optionId: params.optionId,
    },
    select: { instructorId: true },
  });
  return rows.map((r) => r.instructorId);
}

function getTeacherIdealOptionId(
  answers: Record<string, string>,
): string | null {
  const optionId = answers["Q5"]; // Q4 -> Q5
  return typeof optionId === "string" && optionId.trim()
    ? optionId.trim()
    : null;
}



// =========================
// POST
// =========================
export async function POST(req: NextRequest) {
  try {
    const body: DiagnosisRequestBody = await req.json().catch(() => ({}));
    const schoolId = body.schoolId ?? "";
    const answers = body.answers ?? {};

    const missing = REQUIRED_QUESTION_IDS.filter((id) => !answers[id]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "MISSING_ANSWERS", missing },
        { status: 400 },
      );
    }

    const campusSlug = norm(answers["Q1"]);
    const campus = await prisma.diagnosisCampus.findFirst({
      where: { schoolId, slug: campusSlug, isActive: true },
      select: { id: true, label: true, slug: true },
    });
    if (!campus)
      return NextResponse.json({ error: "NO_CAMPUS" }, { status: 400 });

    const q2ForCourse = getQ2ValueForCourse(answers);

    const recommendedCourse = await prisma.diagnosisCourse.findFirst({
      where: { schoolId, isActive: true, q2AnswerTags: { has: q2ForCourse } },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true, slug: true },
    });
    // ===== 講師抽出 =====
    const campusInstructorIds = await instructorIdsByCampus({
      schoolId,
      campusId: campus.id,
    });

    const courseInstructorIds = recommendedCourse?.id
      ? await instructorIdsByCourse({
          schoolId,
          courseId: recommendedCourse.id,
        })
      : [];

    // 講師照合は Q5（理想の先生）を利用（旧Q4）
    const teacherIdealOptionId = getTeacherIdealOptionId(answers);
    const concernOptionId = getConcernOptionId(answers);
    const concernInstructorIds = teacherIdealOptionId
      ? await instructorIdsByConcernOption({
          schoolId,
          optionId: teacherIdealOptionId,
        })
      : [];

    const selectInstructor = {
      id: true,
      label: true,
      slug: true,
      photoMime: true,
      photoData: true,
      charmTags: true,
      introduction: true,
    } as const;

    const load = (ids: string[]) =>
      ids.length === 0
        ? []
        : prisma.diagnosisInstructor.findMany({
            where: { schoolId, isActive: true, id: { in: ids } },
            orderBy: { sortOrder: "asc" },
            select: selectInstructor,
          });

    let instructors: any[] = [];
    let instructorMatchedBy = "none";

    // ⭐ 最優先：campus + concern
    if (concernInstructorIds.length > 0) {
      const ids = intersectIds(campusInstructorIds, concernInstructorIds);
      const got = await load(ids);
      if (got.length > 0) {
        instructors = got;
        instructorMatchedBy = "campus+concern";
      }
    }

    // 従来ロジック
    if (instructors.length === 0 && courseInstructorIds.length > 0) {
      const ids = intersectIds(campusInstructorIds, courseInstructorIds);
      const got = await load(ids);
      if (got.length > 0) {
        instructors = got;
        instructorMatchedBy = "campus+course";
      }
    }

    if (instructors.length === 0) {
      const got = await load(campusInstructorIds);
      if (got.length > 0) {
        instructors = got;
        instructorMatchedBy = "campus";
      }
    }

    // ===== コピー =====
    const concernKey = getConcernKey(answers);
    const concernText =
      CONCERN_RESULT_COPY[concernKey] ?? concernMessages[concernKey] ?? "";

    // resultCopy の生成
    const q2Tag = getOptionTagFromAnswers("Q2", answers);
    const q3Tag = getOptionTagFromAnswers("Q3", answers);
    // const q4Tag = getOptionTagFromAnswers("Q4", answers); // ジャンルは一旦コピーに使わない？
    const q5Tag = getOptionTagFromAnswers("Q5", answers); // 先生 (旧Q4)

    const resultCopy = {
      level: q2Tag ? (LEVEL_RESULT_COPY as any)[q2Tag] ?? null : null,
      age: q3Tag ? (AGE_RESULT_COPY as any)[q3Tag] ?? null : null,
      teacher: q5Tag ? (TEACHER_RESULT_COPY as any)[q5Tag] ?? null : null,
      concern: concernText,
    };

    return NextResponse.json({
      instructors: instructors.map((t) => ({
        id: t.id,
        label: t.label,
        slug: t.slug,
        charmTags: t.charmTags ?? null,
        introduction: t.introduction ?? null,
      })),
      resultCopy, // 追加
      concernMessage: concernText,
      debug: {
        concernOptionId,
        teacherIdealOptionId,
        instructorMatchedBy,
        instructorsCount: instructors.length,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: e?.message },
      { status: 500 },
    );
  }
}
