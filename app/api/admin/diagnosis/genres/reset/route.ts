// app/api/admin/diagnosis/genres/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  return session?.user?.email ? session : null;
}

import { DEFAULT_GENRES } from "@/lib/diagnosis/constants";

export async function POST(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.schoolId) return NextResponse.json({ message: "schoolId が必要です" }, { status: 400 });

    const schoolId = String(body.schoolId);

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
    return NextResponse.json({ message: "リセットに失败しました", detail: e.message }, { status: 500 });
  }
}
