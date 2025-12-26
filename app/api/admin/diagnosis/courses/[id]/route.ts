import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PatchBody = {
  label?: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
  q2AnswerTags?: string[];
};

function uniqStrings(xs: unknown): string[] {
  if (!Array.isArray(xs)) return [];
  return Array.from(
    new Set(xs.map((v) => String(v ?? "").trim()).filter(Boolean))
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = (await req.json().catch(() => ({}))) as PatchBody;

    const data: any = {};
    if (typeof body.label === "string") data.label = body.label;
    if (typeof body.slug === "string") data.slug = body.slug;
    if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    // ✅ 追加：Q2対応（String[]）
    if (body.q2AnswerTags !== undefined) {
      data.q2AnswerTags = uniqStrings(body.q2AnswerTags);
    }

    const updated = await prisma.diagnosisCourse.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.diagnosisCourse.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "削除に失敗しました" },
      { status: 500 }
    );
  }
}
