// app/api/diagnosis/courses/photo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB
function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

// GET /api/diagnosis/courses/photo?id=xxx&schoolId=yyy
// ✅ Embed から表示できるように「公開」にする（認証なし）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();
  const schoolId = searchParams.get("schoolId")?.trim();
  if (!id || !schoolId)
    return new Response("id / schoolId required", { status: 400 });

  const row = await prisma.diagnosisCourse.findFirst({
    where: { id, schoolId, isActive: true },
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
      // ✅ 画像はキャッシュしてOK（同じidなら内容は基本変わらない想定）
      // 画像を差し替えたらURLに ?v=timestamp を付ける運用にするとより確実
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

// POST /api/diagnosis/courses/photo (multipart/form-data: id, schoolId, file)
// ✅ アップロードは管理画面だけにしたいので、認証必須のまま
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return json("Unauthorized", 401);

    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data"))
      return json("multipart/form-data が必要です", 400);

    const fd = await req.formData();
    const id = String(fd.get("id") ?? "").trim();
    const schoolId = String(fd.get("schoolId") ?? "").trim();
    const file = fd.get("file");

    if (!id || !schoolId) return json("id / schoolId は必須です", 400);
    if (!file || !(file instanceof File) || file.size === 0)
      return json("file は必須です", 400);

    if (file.size > MAX_IMAGE_BYTES) {
      return json(
        `画像サイズが大きすぎます（上限 ${MAX_IMAGE_BYTES} bytes）`,
        400,
      );
    }

    const exists = await prisma.diagnosisCourse.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!exists) return json("対象が見つかりません", 404);

    const photoMime = file.type || "application/octet-stream";
    const ab = await file.arrayBuffer();
    const photoData = Buffer.from(ab);

    const updated = await prisma.diagnosisCourse.update({
      where: { id: exists.id },
      data: { photoMime, photoData },
      select: { id: true, schoolId: true, photoMime: true },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "画像保存に失敗しました", 500);
  }
}
