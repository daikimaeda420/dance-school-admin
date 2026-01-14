// app/api/diagnosis/genres/photo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/diagnosis/genres/photo?id=xxx&schoolId=yyy
 * <img src="..."> で使うため、画像バイナリを返す
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "").trim();
  const schoolId = String(searchParams.get("schoolId") ?? "").trim();

  if (!id || !schoolId) {
    return new NextResponse("bad request", { status: 400 });
  }

  const g = await prisma.diagnosisGenre.findFirst({
    where: { id, schoolId },
    select: { photoMime: true, photoData: true, updatedAt: true },
  });

  if (!g?.photoMime || !g.photoData) {
    return new NextResponse("not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", g.photoMime);

  // 管理画面で差し替えがあるので強キャッシュしない（必要なら調整）
  headers.set("Cache-Control", "private, max-age=60");

  // 画像が存在することが前提なので、ETagは必須じゃないが軽く付ける
  headers.set("ETag", `"genre-${id}-${g.updatedAt.getTime()}"`);

  return new NextResponse(g.photoData, { status: 200, headers });
}
