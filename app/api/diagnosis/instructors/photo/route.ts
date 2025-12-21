import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB
function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

// GET /api/diagnosis/instructors/photo?id=xxx&schoolId=yyy
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();
  const schoolId = searchParams.get("schoolId")?.trim();
  if (!id || !schoolId)
    return new Response("id / schoolId required", { status: 400 });

  const row = await prisma.diagnosisInstructor.findFirst({
    where: { id, schoolId },
    select: { photoData: true, photoMime: true },
  });

  if (!row?.photoData || !row.photoMime)
    return new Response("Not Found", { status: 404 });

  const bytes = row.photoData as unknown as Uint8Array;

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": row.photoMime,
      "Cache-Control": "no-store",
    },
  });
}

// POST /api/diagnosis/instructors/photo  (multipart/form-data: id, schoolId, file)
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
        400
      );
    }

    const exists = await prisma.diagnosisInstructor.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!exists) return json("対象が見つかりません", 404);

    const photoMime = file.type || "application/octet-stream";
    const ab = await file.arrayBuffer();
    const photoData = Buffer.from(ab);

    const updated = await prisma.diagnosisInstructor.update({
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
