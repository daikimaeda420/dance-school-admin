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
    const q2ForCourse = getQ2ValueForCourse(answers);
    
    // ✅ Q4 は動的なので答案そのものをタグとして扱う（Frontend で id=tag としているため）
    const q4Tag = answers["Q4"]; 

    // 校舎とコースは互いに依存しないため、最初の待機を並列化する。
    // 校舎は結果表示に必要な情報まで一度に取得し、後段の重複照会をなくす。
    const [campus, recommendedCourse] = await Promise.all([
      prisma.diagnosisCampus.findFirst({
        where: { schoolId, slug: campusSlug, isActive: true },
        select: {
          id: true,
          label: true,
          slug: true,
          address: true,
          access: true,
          googleMapUrl: true,
          googleMapEmbedUrl: true,
        },
      }),
      prisma.diagnosisCourse.findFirst({
        where: {
          schoolId,
          isActive: true,
          q2AnswerTags: { has: q2ForCourse },
          // ✅ Q4タグ（ジャンル）で絞り込み
          ...(q4Tag ? { genreTags: { has: q4Tag } } : {}),
        },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          label: true,
          slug: true,
          description: true,
          photoMime: true,
          youtubeVideoId: true,
        },
      }),
    ]);
    if (!campus)
      return NextResponse.json({ error: "NO_CAMPUS" }, { status: 400 });
    // ===== 講師抽出 =====
    // 講師照合は Q5（理想の先生）を利用（旧Q4）
    const teacherIdealOptionId = getTeacherIdealOptionId(answers);
    const concernOptionId = getConcernOptionId(answers);
    const [campusInstructorIds, courseInstructorIds, concernInstructorIds] =
      await Promise.all([
        instructorIdsByCampus({ schoolId, campusId: campus.id }),
        recommendedCourse?.id
          ? instructorIdsByCourse({ schoolId, courseId: recommendedCourse.id })
          : Promise.resolve([]),
        teacherIdealOptionId
          ? instructorIdsByConcernOption({ schoolId, optionId: teacherIdealOptionId })
          : Promise.resolve([]),
      ]);

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

    // 優先順は保持しつつ、候補IDを先に決めて講師本体の検索を一度だけにする。
    const matchCandidates: Array<{ ids: string[]; matchedBy: string }> = [
      {
        ids:
          courseInstructorIds.length > 0 && concernInstructorIds.length > 0
            ? intersectIds(
                intersectIds(campusInstructorIds, courseInstructorIds),
                concernInstructorIds,
              )
            : [],
        matchedBy: "campus+course+concern",
      },
      {
        ids:
          courseInstructorIds.length > 0
            ? intersectIds(campusInstructorIds, courseInstructorIds)
            : [],
        matchedBy: "campus+course",
      },
      {
        ids:
          concernInstructorIds.length > 0
            ? intersectIds(campusInstructorIds, concernInstructorIds)
            : [],
        matchedBy: "campus+concern",
      },
      { ids: campusInstructorIds, matchedBy: "campus" },
    ];
    // 校舎に紐づく有効講師を一度だけ読み、優先候補に有効講師がいるかを
    // メモリ上で判定する。これで従来のフォールバック順も維持できる。
    const activeCampusInstructors = await load(campusInstructorIds);
    const activeInstructorIds = new Set(
      activeCampusInstructors.map((instructor) => instructor.id),
    );
    const selectedInstructorMatch = matchCandidates.find(({ ids }) =>
      ids.some((id) => activeInstructorIds.has(id)),
    );
    const selectedInstructorIds = new Set(selectedInstructorMatch?.ids ?? []);
    const instructors = selectedInstructorMatch
      ? activeCampusInstructors.filter((instructor) =>
          selectedInstructorIds.has(instructor.id),
        )
      : [];
    const instructorMatchedBy = selectedInstructorMatch?.matchedBy ?? "none";

    // ===== コピー =====
    const concernKey = getConcernKey(answers);
    const concernText =
      CONCERN_RESULT_COPY[concernKey] ?? concernMessages[concernKey] ?? "";

    // resultCopy の生成
    const q2Tag = getOptionTagFromAnswers("Q2", answers);
    const q3Tag = getOptionTagFromAnswers("Q3", answers) || answers["Q3"];
    // const q4Tag = getOptionTagFromAnswers("Q4", answers); // ジャンルは一旦コピーに使わない？
    const q5Tag = getOptionTagFromAnswers("Q5", answers); // 先生 (旧Q4)

    const resultCopy = {
      level: q2Tag ? (LEVEL_RESULT_COPY as any)[q2Tag] ?? null : null,
      age: q3Tag ? (AGE_RESULT_COPY as any)[q3Tag] ?? null : null,
      teacher: q5Tag ? (TEACHER_RESULT_COPY as any)[q5Tag] ?? null : null,
      concern: concernText,
    };

    const selectedCourse = recommendedCourse
      ? {
          id: recommendedCourse.id,
          label: recommendedCourse.label,
          slug: recommendedCourse.slug,
          description: recommendedCourse.description ?? null,
          youtubeVideoId: recommendedCourse.youtubeVideoId ?? null,
          photoUrl: recommendedCourse.photoMime
            ? `/api/diagnosis/courses/photo?schoolId=${encodeURIComponent(
                schoolId,
              )}&id=${encodeURIComponent(recommendedCourse.id)}`
            : null,
        }
      : null;

    // ===== スコア計算（減点式） =====
    // 基準: 100点 から各Qの回答に応じて減点
    // Q1: 減点なし
    // Q2: 2-3 → -2 / 2-4 → -3 / 2-5 → -4
    // Q3: college(大学生) → -5 / worker(社会人) → -2 / homemaker(主婦) → -2
    // Q4: 減点なし
    // Q5: 5-2(プロ志望) → -5 / 5-3(ベテラン希望) → -2
    // Q6: 減点なし
    const Q2_DEDUCT: Record<string, number> = {
      "2-3": -2,
      "2-4": -3,
      "2-5": -4,
    };
    const Q3_DEDUCT: Record<string, number> = {
      college:   -5,
      worker:    -2,
      homemaker: -2,
    };
    const Q5_DEDUCT: Record<string, number> = {
      "5-2": -5,
      "5-3": -2,
    };

    // q2Tag / q3Tag は上の resultCopy ブロックで宣言済みのものを流用
    const q5Answer = answers["Q5"] ?? "";

    const deduct =
      (Q2_DEDUCT[answers["Q2"] ?? ""] ?? 0) +
      (Q3_DEDUCT[q3Tag ?? ""]        ?? 0) +
      (Q5_DEDUCT[q5Answer]           ?? 0);

    const score = 100 + deduct;

    return NextResponse.json({
      score,
      pattern: "A" as const,
      patternMessage: null,
      headerLabel: recommendedCourse?.label ?? "おすすめのクラス",
      bestMatch: {
        classId: recommendedCourse?.id ?? undefined,
        className: recommendedCourse?.label ?? undefined,
        levels: [],
        targets: [],
      },
      teacher: {
        styles: [],
      },
      breakdown: [],
      worstMatch: null,
      allScores: [],
      campus: campus
        ? {
            id: campus.id,
            label: campus.label,
            slug: campus.slug,
            address: campus.address ?? null,
            access: campus.access ?? null,
            googleMapUrl: campus.googleMapUrl ?? null,
            googleMapEmbedUrl: campus.googleMapEmbedUrl ?? null,
            mapLinkUrl: campus.googleMapUrl ?? null,
            mapEmbedUrl: campus.googleMapEmbedUrl ?? null,
          }
        : undefined,
      selectedCourse,
      instructors: instructors.map((t) => {
        const hasImage =
          t.photoData &&
          (t.photoData as any).length > 0 &&
          Boolean(t.photoMime);

        const photoUrl = hasImage
          ? `/api/diagnosis/instructors/photo?schoolId=${encodeURIComponent(
              schoolId,
            )}&id=${encodeURIComponent(t.id)}`
          : null;

        return {
          id: t.id,
          label: t.label,
          slug: t.slug,
          charmTags: t.charmTags ?? null,
          introduction: t.introduction ?? null,
          photoUrl,
        };
      }),
      resultCopy,
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
