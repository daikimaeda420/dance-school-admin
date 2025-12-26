// app/api/admin/diagnosis/courses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PatchBody = {
  label?: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;

  // ★ Q2対応（診断用コース管理）
  q2AnswerTags?: string[]; // <- Prisma が String[] の場合
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const body = (await req.json()) as PatchBody;

    // 型の正規化（ここがないと「保存されない/弾かれる」が起きがち）
    const q2 =
      body.q2AnswerTags === undefined
        ? undefined
        : Array.isArray(body.q2AnswerTags)
        ? body.q2AnswerTags.filter(
            (v) => typeof v === "string" && v.trim() !== ""
          )
        : [];

    const updated = await prisma.diagnosisCourse.update({
      where: { id },
      data: {
        ...(body.label !== undefined ? { label: body.label } : {}),
        ...(body.slug !== undefined ? { slug: body.slug } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),

        // ★ Q2を必ずupdateに含める
        ...(q2 !== undefined ? { q2AnswerTags: q2 } : {}),
      },
    });

    return NextResponse.json({ ok: true, course: updated });
  } catch (e: any) {
    console.error("[PATCH /admin/diagnosis/courses/:id] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
