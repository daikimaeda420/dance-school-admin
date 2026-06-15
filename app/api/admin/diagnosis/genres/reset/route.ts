// app/api/admin/diagnosis/genres/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/authz";

export const runtime = "nodejs";

import { DEFAULT_GENRES } from "@/lib/diagnosis/constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.schoolId) return NextResponse.json({ message: "schoolId が必要です" }, { status: 400 });

    const schoolId = String(body.schoolId);
    const auth = await requireSchoolAccess(schoolId);
    if (!auth.ok) return auth.response;

    // 削除して再作成
    await prisma.diagnosisGenre.deleteMany({ where: { schoolId } });

    await prisma.diagnosisGenre.createMany({
      data: DEFAULT_GENRES.map((d) => ({
        schoolId,
        label: d.label,
        slug: d.slug,
        sortOrder: d.sortOrder,
        isActive: true,
      })),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: "リセットに失敗しました" }, { status: 500 });
  }
}
