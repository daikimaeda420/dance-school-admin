// app/api/admin/diagnosis/schedule-slots/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return session;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function serverError(e: unknown, fallback = "Server error") {
  const msg =
    e instanceof Error ? e.message : typeof e === "string" ? e : fallback;

  const anyErr = e as any;
  const details =
    anyErr?.code != null
      ? `code=${String(anyErr.code)} meta=${JSON.stringify(anyErr.meta ?? {})}`
      : "";

  return NextResponse.json(
    { message: `${msg}${details ? ` (${details})` : ""}` },
    { status: 500 },
  );
}

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
type Weekday = (typeof WEEKDAYS)[number];

type Body = {
  schoolId: string;
  weekday: Weekday;
  genreText: string;
  timeText: string;
  teacher: string;
  place: string;
  sortOrder?: number;
  isActive?: boolean;
  courseIds: string[];
};

// GET /api/admin/diagnosis/schedule-slots?schoolId=xxx
export async function GET(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) return bad("Unauthorized", 401);

  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    if (!schoolId) return bad("schoolId が必要です");

    const slots = await prisma.diagnosisScheduleSlot.findMany({
      where: { schoolId },
      orderBy: [{ weekday: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      include: { courses: true },
    });

    return NextResponse.json({
      slots: slots.map((s) => ({
        id: s.id,
        schoolId: s.schoolId,
        weekday: s.weekday,
        genreText: s.genreText,
        timeText: s.timeText,
        teacher: s.teacher,
        place: s.place,
        sortOrder: s.sortOrder,
        isActive: s.isActive,
        courseIds: s.courses.map((c) => c.courseId),
      })),
    });
  } catch (e) {
    console.error("[schedule-slots][GET]", e);
    return serverError(e, "Failed to load schedule slots");
  }
}

// POST /api/admin/diagnosis/schedule-slots
export async function POST(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) return bad("Unauthorized", 401);

  try {
    const body = (await req.json().catch(() => null)) as Partial<Body> | null;
    if (!body) return bad("リクエストJSONが不正です", 400);

    if (!body.schoolId) return bad("schoolId が必要です");
    if (!body.weekday || !WEEKDAYS.includes(body.weekday))
      return bad("weekday が不正です");

    const genreText = String(body.genreText ?? "").trim();
    const timeText = String(body.timeText ?? "").trim();
    const teacher = String(body.teacher ?? "").trim();
    const place = String(body.place ?? "").trim();

    if (!genreText) return bad("ジャンルが必要です");
    if (!timeText) return bad("時間が必要です");
    if (!teacher) return bad("講師が必要です");
    if (!place) return bad("場所が必要です");

    const courseIdsRaw = Array.isArray(body.courseIds) ? body.courseIds : [];
    const courseIds = courseIdsRaw.map(String).filter(Boolean);

    if (courseIds.length === 0) {
      return bad("対応コースを1つ以上選択してください");
    }

    // ✅ 念のため重複排除（複合PK(slotId,courseId) で落ちるのを防ぐ）
    const uniqCourseIds = Array.from(new Set(courseIds));

    const created = await prisma.diagnosisScheduleSlot.create({
      data: {
        schoolId: String(body.schoolId),
        weekday: body.weekday,
        genreText,
        timeText,
        teacher,
        place,
        sortOrder: Number(body.sortOrder ?? 0),
        isActive: Boolean(body.isActive ?? true),

        // ✅ createMany ではなく create の配列で確実に作る
        courses: {
          create: uniqCourseIds.map((courseId) => ({ courseId })),
        },
      },
      include: { courses: true },
    });

    return NextResponse.json({
      slot: {
        id: created.id,
        schoolId: created.schoolId,
        weekday: created.weekday,
        genreText: created.genreText,
        timeText: created.timeText,
        teacher: created.teacher,
        place: created.place,
        sortOrder: created.sortOrder,
        isActive: created.isActive,
        courseIds: created.courses.map((c) => c.courseId),
      },
    });
  } catch (e) {
    console.error("[schedule-slots][POST]", e);
    return serverError(e, "Failed to create schedule slot");
  }
}
