// app/api/admin/diagnosis/schedule-slots/[id]/route.ts
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

type PatchBody = {
  weekday?: Weekday;
  genreText?: string;
  timeText?: string;
  teacher?: string;
  place?: string;
  sortOrder?: number;
  isActive?: boolean;
  courseIds?: string[]; // 送られてきたら紐付けを置き換え
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await ensureLoggedIn();
  if (!session) return bad("Unauthorized", 401);

  try {
    const id = String(params.id || "");
    if (!id) return bad("id が不正です", 400);

    const body = (await req.json().catch(() => null)) as PatchBody | null;
    if (!body) return bad("リクエストJSONが不正です", 400);

    const exists = await prisma.diagnosisScheduleSlot.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) return bad("Not found", 404);

    const data: any = {};

    if (body.weekday != null) {
      if (!WEEKDAYS.includes(body.weekday)) return bad("weekday が不正です");
      data.weekday = body.weekday;
    }
    if (body.genreText !== undefined)
      data.genreText = String(body.genreText).trim();
    if (body.timeText !== undefined)
      data.timeText = String(body.timeText).trim();
    if (body.teacher !== undefined) data.teacher = String(body.teacher).trim();
    if (body.place !== undefined) data.place = String(body.place).trim();
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    // courseIds: undefined → 触らない / [] → エラー / [..] → 置き換え
    const hasCourseIds = Object.prototype.hasOwnProperty.call(
      body,
      "courseIds",
    );
    let nextCourseIds: string[] | null = null;

    if (hasCourseIds) {
      if (!Array.isArray(body.courseIds) || body.courseIds.length === 0) {
        return bad("対応コースを1つ以上選択してください");
      }
      // ✅ 重複排除（複合PKで落ちるのを防ぐ）
      nextCourseIds = Array.from(
        new Set(body.courseIds.map(String).filter(Boolean)),
      );
      if (nextCourseIds.length === 0) {
        return bad("対応コースを1つ以上選択してください");
      }
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.diagnosisScheduleSlot.update({ where: { id }, data });
      }

      if (nextCourseIds) {
        await tx.diagnosisScheduleSlotCourse.deleteMany({
          where: { slotId: id },
        });

        // ✅ createManyではなく create 配列で確実に作る
        for (const courseId of nextCourseIds) {
          await tx.diagnosisScheduleSlotCourse.create({
            data: { slotId: id, courseId },
          });
        }
      }
    });

    const updated = await prisma.diagnosisScheduleSlot.findUnique({
      where: { id },
      include: { courses: true },
    });

    if (!updated) return bad("Not found", 404);

    return NextResponse.json({
      slot: {
        id: updated.id,
        weekday: updated.weekday,
        genreText: updated.genreText,
        timeText: updated.timeText,
        teacher: updated.teacher,
        place: updated.place,
        sortOrder: updated.sortOrder,
        isActive: updated.isActive,
        courseIds: updated.courses.map((c) => c.courseId),
      },
    });
  } catch (e) {
    console.error("[schedule-slots][PATCH]", e);
    return serverError(e, "Failed to update schedule slot");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await ensureLoggedIn();
  if (!session) return bad("Unauthorized", 401);

  try {
    const id = String(params.id || "");
    if (!id) return bad("id が不正です", 400);

    // 論理削除（運用安定）
    const updated = await prisma.diagnosisScheduleSlot.update({
      where: { id },
      data: { isActive: false },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (e) {
    console.error("[schedule-slots][DELETE]", e);
    return serverError(e, "Failed to delete schedule slot");
  }
}
