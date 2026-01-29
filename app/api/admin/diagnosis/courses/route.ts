// app/api/admin/diagnosis/courses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

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
        .filter(Boolean),
    ),
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
      { status: 400 },
    );
  }

  const courses = await prisma.diagnosisCourse.findMany({
    where: { schoolId },
    orderBy: { sortOrder: "asc" },
    // ✅ Bytesは返さない（重い）。存在判定だけできればOK
    select: {
      id: true,
      schoolId: true,
      label: true,
      slug: true,
      sortOrder: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      q2AnswerTags: true,

      // ✅ 追加
      answerTag: true,
      photoMime: true,
      // photoData は select しない
    },
  });

  // ✅ UI用の付加情報（hasImage / photoUrl）
  const withMeta = courses.map((c) => {
    const hasImage = Boolean(c.photoMime); // photoData未selectなのでmimeで代用（※より厳密にしたいなら後述）
    const photoUrl = hasImage
      ? `/api/diagnosis/courses/photo?schoolId=${encodeURIComponent(
          schoolId,
        )}&id=${encodeURIComponent(c.id)}`
      : null;

    // photoMime はUIに不要なので落として返す
    const { photoMime, ...rest } = c as any;

    return {
      ...rest,
      hasImage,
      photoUrl,
    };
  });

  return NextResponse.json(withMeta);
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
      { status: 400 },
    );
  }

  const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : 0;

  // ✅ Q2タグを正規化して保存
  const q2AnswerTags = normalizeStringArray(body.q2AnswerTags);

  // ✅ 追加：answerTag（Q4紐づけ）
  const answerTag =
    typeof body.answerTag === "string" && body.answerTag.trim()
      ? body.answerTag.trim()
      : null;

  const course = await prisma.diagnosisCourse.create({
    data: {
      schoolId: body.schoolId,
      label: body.label.trim(),
      slug: body.slug.trim(),
      sortOrder,
      isActive: body.isActive !== false,
      q2AnswerTags,
      answerTag, // ✅ 追加
    },
  });

  return NextResponse.json(course, { status: 201 });
}
