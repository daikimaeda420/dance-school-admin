// app/api/admin/diagnosis/courses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRecordSchoolAccess } from "@/lib/authz";

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

type PatchBody = {
  label?: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
  q2AnswerTags?: string[];

  // ✅ 追加：コース説明文
  description?: string | null;

  // ✅ 追加：Q4
  genreTags?: string[];

  // ✅ 追加：YouTube動画ID
  youtubeVideoId?: string | null;
};

function normalizeNullableText(v: unknown): string | null {
  if (v === null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const access = await requireRecordSchoolAccess(
      () =>
        prisma.diagnosisCourse.findUnique({
          where: { id },
          select: { schoolId: true },
        }),
      "対象のコースが見つかりません",
    );
    if (!access.ok) return access.response;

    const body = (await req.json()) as PatchBody;

    const q2 =
      body.q2AnswerTags === undefined
        ? undefined
        : normalizeStringArray(body.q2AnswerTags);

    // ✅ 追加：Q4（ジャンル）
    const genreTags =
      body.genreTags === undefined
        ? undefined
        : normalizeStringArray(body.genreTags);

    // ✅ 追加：description（undefined=更新しない / null or string=更新する）
    const nextDescription =
      body.description === undefined
        ? undefined
        : normalizeNullableText(body.description);

    // ✅ 追加：youtubeVideoId
    const nextYoutubeVideoId =
      body.youtubeVideoId === undefined
        ? undefined
        : normalizeNullableText(body.youtubeVideoId);

    const updated = await prisma.diagnosisCourse.update({
      where: { id },
      data: {
        ...(body.label !== undefined
          ? { label: String(body.label).trim() }
          : {}),
        ...(body.slug !== undefined ? { slug: String(body.slug).trim() } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(q2 !== undefined ? { q2AnswerTags: q2 } : {}),

        // ✅ 追加
        ...(genreTags !== undefined ? { genreTags } : {}),

        // ✅ 追加
        ...(nextDescription !== undefined
          ? { description: nextDescription }
          : {}),

        // ✅ 追加
        ...(nextYoutubeVideoId !== undefined
          ? { youtubeVideoId: nextYoutubeVideoId }
          : {}),
      },
    });

    return NextResponse.json({ ok: true, course: updated });
  } catch (e: any) {
    console.error("[PATCH /admin/diagnosis/courses/:id] error:", e);
    return NextResponse.json(
      { ok: false, error: "更新に失敗しました" },
      { status: 500 },
    );
  }
}

// ✅ DELETE /api/admin/diagnosis/courses/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const access = await requireRecordSchoolAccess(
      () =>
        prisma.diagnosisCourse.findUnique({
          where: { id },
          select: { schoolId: true },
        }),
      "対象のコースが見つかりません",
    );
    if (!access.ok) return access.response;

    await prisma.diagnosisCourse.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[DELETE /admin/diagnosis/courses/:id] error:", e);

    return NextResponse.json(
      { ok: false, error: "削除に失敗しました" },
      { status: 500 },
    );
  }
}
