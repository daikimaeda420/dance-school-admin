import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return session;
}

// GET /api/admin/diagnosis/instructors?schoolId=xxx
export async function GET(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");
  if (!schoolId)
    return NextResponse.json(
      { message: "schoolId が必要です" },
      { status: 400 }
    );

  const rows = await prisma.diagnosisInstructor.findMany({
    where: { schoolId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(rows);
}

// POST /api/admin/diagnosis/instructors
export async function POST(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);

  if (
    !body ||
    typeof body.schoolId !== "string" ||
    typeof body.label !== "string" || // ✅
    typeof body.slug !== "string"
  ) {
    return NextResponse.json(
      { message: "schoolId / label / slug は必須です" },
      { status: 400 }
    );
  }

  const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : 0;

  const created = await prisma.diagnosisInstructor.create({
    data: {
      schoolId: body.schoolId,
      label: body.label, // ✅
      slug: body.slug,
      sortOrder,
      isActive: body.isActive !== false,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
