// app/api/diagnosis/media/banner/info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/diagnosis/media/banner/info?schoolId=xxx
// 公開API: バナー画像の有無と更新日時のみを返す（認証不要）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId")?.trim();
    if (!schoolId) {
      return NextResponse.json({ message: "schoolId required" }, { status: 400 });
    }

    const row = await prisma.diagnosisMedia.findUnique({
      where: { schoolId_key: { schoolId, key: "campaign_banner" } },
      select: { id: true, photoMime: true, updatedAt: true },
    });

    return NextResponse.json({
      hasImage: !!row,
      mime: row?.photoMime ?? null,
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ message: "取得に失敗しました" }, { status: 500 });
  }
}
