import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const schoolId = new URL(req.url).searchParams.get("schoolId")?.trim();
  if (!schoolId) return NextResponse.json({ error: "schoolId が必要です" }, { status: 400 });
  const auth = await requireSchoolAccess(schoolId);
  if (!auth.ok) return auth.response;
  const reservations = await prisma.chatReservation.findMany({
    where: { schoolId }, orderBy: { createdAt: "desc" }, take: 200,
    select: { id: true, name: true, email: true, phone: true, preferredDate: true, note: true, status: true, createdAt: true },
  });
  return NextResponse.json({ reservations }, { headers: { "Cache-Control": "no-store" } });
}
