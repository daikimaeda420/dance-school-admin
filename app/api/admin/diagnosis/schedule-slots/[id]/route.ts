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

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

type PatchBody = {
  weekday?: (typeof WEEKDAYS)[number];
  genreText?: string;
  timeText?: string;
  teacher?: string;
  place?: string;
  sortOrder?: number;
  isActive?: boolean;
  courseIds?: string[]; // これが来たら紐付けを置き換え
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await ensureLoggedIn();
  if (!session) return bad("Unauthorized", 401);

  const id = params.id;
  const body = (await req.json()) as PatchBody;

  const slot = await prisma.diagnosisScheduleSlot.findUnique({
    where: { id },
    include: { courses: true },
  });
  if (!slot) return bad("Not found", 404);

  const data: any = {};
  if (body.weekday) {
    if (!WEEKDAYS.includes(body.weekday)) return bad("weekday が不正です");
    data.weekday = body.weekday;
  }
  if (body.genreText !== undefined) data.genreText = body.genreText.trim();
  if (body.timeText !== undefined) data.timeText = body.timeText.trim();
  if (body.teacher !== undefined) data.teacher = body.teacher.trim();
  if (body.place !== undefined) data.place = body.place.trim();
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const tx: any[] = [];
  tx.push(prisma.diagnosisScheduleSlot.update({ where: { id }, data }));

  if (body.courseIds) {
    if (!Array.isArray(body.courseIds) || body.courseIds.length === 0) {
      return bad("対応コースを1つ以上選択してください");
    }
    tx.push(
      prisma.diagnosisScheduleSlotCourse.deleteMany({ where: { slotId: id } }),
      prisma.diagnosisScheduleSlotCourse.createMany({
        data: body.courseIds.map((courseId) => ({ slotId: id, courseId })),
      }),
    );
  }

  await prisma.$transaction(tx);

  const updated = await prisma.diagnosisScheduleSlot.findUnique({
    where: { id },
    include: { courses: true },
  });

  return NextResponse.json({
    slot: {
      id: updated!.id,
      weekday: updated!.weekday,
      genreText: updated!.genreText,
      timeText: updated!.timeText,
      teacher: updated!.teacher,
      place: updated!.place,
      sortOrder: updated!.sortOrder,
      isActive: updated!.isActive,
      courseIds: updated!.courses.map((c) => c.courseId),
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await ensureLoggedIn();
  if (!session) return bad("Unauthorized", 401);

  const id = params.id;

  // 論理削除（運用安定）
  await prisma.diagnosisScheduleSlot.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
