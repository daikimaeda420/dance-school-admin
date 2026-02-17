// app/api/admin/diagnosis/courses/[id]/route.ts
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

  // ✅ 既存
  answerTag?: string | null;

  // ✅ 追加：コース説明文
  description?: string | null;

  // ✅ 追加：Q4
  genreTags?: string[];
};

function normalizeNullableText(v: unknown): string | null {
  if (v === null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

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

    const nextAnswerTag =
      body.answerTag === undefined
        ? undefined
        : body.answerTag === null
          ? null
          : typeof body.answerTag === "string" && body.answerTag.trim()
            ? body.answerTag.trim()
            : null;

    // ✅ 追加：description（undefined=更新しない / null or string=更新する）
    const nextDescription =
      body.description === undefined
        ? undefined
        : normalizeNullableText(body.description);

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

        ...(nextAnswerTag !== undefined ? { answerTag: nextAnswerTag } : {}),

        // ✅ 追加
        ...(nextDescription !== undefined
          ? { description: nextDescription }
          : {}),
      },
    });

    return NextResponse.json({ ok: true, course: updated });
  } catch (e: any) {
    console.error("[PATCH /admin/diagnosis/courses/:id] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}

// ✅ DELETE /api/admin/diagnosis/courses/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.diagnosisCourse.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[DELETE /admin/diagnosis/courses/:id] error:", e);

    return NextResponse.json(
      { ok: false, error: e?.message ?? "Delete failed" },
      { status: 500 },
    );
  }
}
