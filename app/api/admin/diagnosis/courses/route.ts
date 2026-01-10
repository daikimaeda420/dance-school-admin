// app/api/admin/diagnosis/courses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return session;
}

function normalizeStringArray(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return Array.from(
    new Set(
      v
        .filter((x) => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

// GET /api/admin/diagnosis/courses?schoolId=xxx
export async function GET(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");

  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId が必要です" },
      { status: 400 }
    );
  }

  const courses = await prisma.diagnosisCourse.findMany({
    where: { schoolId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(courses);
}

// POST /api/admin/diagnosis/courses
export async function POST(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  if (
    !body ||
    !body.schoolId ||
    !body.label ||
    !body.slug ||
    typeof body.schoolId !== "string" ||
    typeof body.label !== "string" ||
    typeof body.slug !== "string"
  ) {
    return NextResponse.json(
      { message: "schoolId / label / slug は必須です" },
      { status: 400 }
    );
  }

  const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : 0;

  // ✅ 追加：Q2タグを正規化して保存
  const q2AnswerTags = normalizeStringArray(body.q2AnswerTags);

  const course = await prisma.diagnosisCourse.create({
    data: {
      schoolId: body.schoolId,
      label: body.label.trim(),
      slug: body.slug.trim(),
      sortOrder,
      isActive: body.isActive !== false,
      q2AnswerTags, // ←これが無かった
    },
  });

  return NextResponse.json(course, { status: 201 });
}
