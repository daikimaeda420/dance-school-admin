// app/api/diagnosis/media/video/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/diagnosis/media/video?schoolId=xxx
// 公開（認証なし）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId")?.trim();
    if (!schoolId) {
      return NextResponse.json({ message: "schoolId required" }, { status: 400 });
    }

    const row = await prisma.diagnosisMedia.findUnique({
      where: { schoolId_key: { schoolId, key: "youtube_video" } },
      select: { textData: true },
    });

    return NextResponse.json({ videoId: row?.textData || null });
  } catch (e: any) {
    return NextResponse.json({ message: "エラーが発生しました" }, { status: 500 });
  }
}
