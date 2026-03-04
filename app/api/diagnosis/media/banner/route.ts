// app/api/diagnosis/media/banner/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/diagnosis/media/banner?schoolId=xxx
// 公開（認証なし）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId")?.trim();
  if (!schoolId) {
    return new Response("schoolId required", { status: 400 });
  }

  const row = await prisma.diagnosisMedia.findUnique({
    where: { schoolId_key: { schoolId, key: "campaign_banner" } },
    select: { photoData: true, photoMime: true },
  });

  if (!row?.photoData || row.photoData.length === 0) {
    return new Response("Not Found", { status: 404 });
  }

  const mime = row.photoMime || "image/jpeg";
  const bytes = row.photoData as unknown as Uint8Array;

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
