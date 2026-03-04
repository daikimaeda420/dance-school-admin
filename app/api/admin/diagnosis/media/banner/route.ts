// app/api/admin/diagnosis/media/banner/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB
function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  return session?.user?.email ? session : null;
}

// GET /api/admin/diagnosis/media/banner?schoolId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    if (!schoolId) return json("schoolId が必要です", 400);

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
    return json("取得に失敗しました", 500);
  }
}

// POST /api/admin/diagnosis/media/banner (multipart/form-data: schoolId, file)
export async function POST(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data"))
      return json("multipart/form-data が必要です", 400);

    const fd = await req.formData();
    const schoolId = String(fd.get("schoolId") ?? "").trim();
    const file = fd.get("file");

    if (!schoolId) return json("schoolId は必須です", 400);
    if (!file || !(file instanceof File) || file.size === 0)
      return json("file は必須です", 400);

    if (file.size > MAX_IMAGE_BYTES) {
      return json(`画像サイズが大きすぎます（上限 ${MAX_IMAGE_BYTES} bytes）`, 400);
    }

    const photoMime = file.type || "application/octet-stream";
    const ab = await file.arrayBuffer();
    const photoData = Buffer.from(ab);

    const upserted = await prisma.diagnosisMedia.upsert({
      where: { schoolId_key: { schoolId, key: "campaign_banner" } },
      update: { photoMime, photoData },
      create: {
        schoolId,
        key: "campaign_banner",
        photoMime,
        photoData,
      },
      select: { id: true, schoolId: true, photoMime: true },
    });

    return NextResponse.json(upserted, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return json("画像保存に失敗しました", 500);
  }
}

// DELETE /api/admin/diagnosis/media/banner
export async function DELETE(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    if (!body?.schoolId) return json("schoolId が必要です", 400);

    await prisma.diagnosisMedia.delete({
       where: { schoolId_key: { schoolId: body.schoolId, key: "campaign_banner" } }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // 存在しない場合はエラーにせず成功扱いとしておく
    if (e.code === 'P2025') return NextResponse.json({ ok: true });
    return json("削除に失敗しました", 500);
  }
}
