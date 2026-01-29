import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
type Weekday = (typeof ORDER)[number];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");
  const courseId = searchParams.get("courseId");

  if (!schoolId || !courseId) {
    return NextResponse.json(
      { message: "schoolId と courseId が必要です" },
      { status: 400 },
    );
  }

  const slots = await prisma.diagnosisScheduleSlot.findMany({
    where: {
      schoolId,
      isActive: true,
      courses: { some: { courseId } },
    },
    orderBy: [{ weekday: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const grouped: Record<Weekday, any[]> = {
    MON: [],
    TUE: [],
    WED: [],
    THU: [],
    FRI: [],
    SAT: [],
    SUN: [],
  };

  for (const s of slots) {
    grouped[s.weekday as Weekday].push({
      id: s.id,
      genreText: s.genreText,
      timeText: s.timeText,
      teacher: s.teacher,
      place: s.place,
    });
  }

  return NextResponse.json({ schedule: grouped, order: ORDER });
}
