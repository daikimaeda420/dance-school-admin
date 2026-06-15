// app/api/admin/diagnosis/media/video/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/authz";

export const runtime = "nodejs";

function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

// 簡単なYouTube URLのパース処理
// - https://www.youtube.com/watch?v=VIDEO_ID
// - https://youtu.be/VIDEO_ID
// - https://www.youtube.com/embed/VIDEO_ID
function extractYouTubeId(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/")[2] || null;
      }
      return url.searchParams.get("v");
    }
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1) || null;
    }
    return null;
  } catch {
    return null;
  }
}

// GET /api/admin/diagnosis/media/video?schoolId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    if (!schoolId) return json("schoolId が必要です", 400);

    const auth = await requireSchoolAccess(schoolId);
    if (!auth.ok) return auth.response;

    const row = await prisma.diagnosisMedia.findUnique({
      where: { schoolId_key: { schoolId, key: "youtube_video" } },
      select: { textData: true },
    });

    return NextResponse.json({
      videoId: row?.textData || null,
    });
  } catch (e: any) {
    return json("取得に失敗しました", 500);
  }
}

// POST /api/admin/diagnosis/media/video
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.schoolId) return json("schoolId は必須です", 400);
    if (!body?.url) return json("YouTubeのURLを入力してください", 400);

    const auth = await requireSchoolAccess(body.schoolId);
    if (!auth.ok) return auth.response;

    const videoId = extractYouTubeId(body.url);
    if (!videoId) return json("無効なYouTube URLです", 400);

    await prisma.diagnosisMedia.upsert({
      where: { schoolId_key: { schoolId: body.schoolId, key: "youtube_video" } },
      update: { textData: videoId },
      create: {
        schoolId: body.schoolId,
        key: "youtube_video",
        textData: videoId,
      },
    });

    return NextResponse.json({ videoId }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return json("動画IDの保存に失敗しました", 500);
  }
}

// DELETE /api/admin/diagnosis/media/video
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.schoolId) return json("schoolId が必要です", 400);

    const auth = await requireSchoolAccess(body.schoolId);
    if (!auth.ok) return auth.response;

    await prisma.diagnosisMedia.delete({
       where: { schoolId_key: { schoolId: body.schoolId, key: "youtube_video" } }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ ok: true });
    return json("削除に失敗しました", 500);
  }
}
