// app/api/diagnosis/genres/image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB
const OK_MIME = ["image/png", "image/jpeg", "image/webp"];

function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function toMessage(e: any) {
  const code = e?.code;
  if (code === "P2022")
    return "DBに存在しないカラムを参照しています（migrate漏れの可能性）";
  if (code === "P2025") return "対象データが見つかりません";
  return e?.message ?? "サーバーエラーが発生しました";
}

function decodeBase64DataUrl(dataUrl: string) {
  // data:image/png;base64,xxxx
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;

  const mime = m[1];
  const b64 = m[2];

  try {
    const buf = Buffer.from(b64, "base64");
    return { mime, buf };
  } catch {
    return null;
  }
}

/**
 * POST /api/diagnosis/genres/image
 * body: { id, schoolId, imageDataUrl }  // imageDataUrl は dataURL
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as any;

    const id = String(body?.id ?? "").trim();
    const schoolId = String(body?.schoolId ?? "").trim();
    const imageDataUrl = String(body?.imageDataUrl ?? "").trim();

    if (!id || !schoolId) return json("id / schoolId が必要です", 400);
    if (!imageDataUrl) return json("imageDataUrl が必要です", 400);

    const decoded = decodeBase64DataUrl(imageDataUrl);
    if (!decoded) return json("画像の形式が不正です（dataURL）", 400);

    const { mime, buf } = decoded;

    if (!OK_MIME.includes(mime)) {
      return json("対応形式は png / jpeg / webp のみです", 400);
    }
    if (buf.byteLength <= 0) return json("画像データが空です", 400);
    if (buf.byteLength > MAX_IMAGE_BYTES) {
      return json("画像サイズが大きすぎます（最大3MB）", 400);
    }

    // 他校のidに書き込めないようにチェック
    const exists = await prisma.diagnosisGenre.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!exists) return json("対象のジャンルが見つかりません", 404);

    await prisma.diagnosisGenre.update({
      where: { id },
      data: {
        photoMime: mime,
        photoData: buf,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[POST /api/diagnosis/genres/image] error", e);
    return NextResponse.json({ message: toMessage(e) }, { status: 500 });
  }
}

/**
 * DELETE /api/diagnosis/genres/image?id=xxx&schoolId=yyy
 * ジャンル画像を削除（photoData/photoMime を null）
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "").trim();
    const schoolId = String(searchParams.get("schoolId") ?? "").trim();

    if (!id || !schoolId) return json("id / schoolId が必要です", 400);

    const exists = await prisma.diagnosisGenre.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!exists) return json("対象のジャンルが見つかりません", 404);

    await prisma.diagnosisGenre.update({
      where: { id },
      data: { photoMime: null, photoData: null },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[DELETE /api/diagnosis/genres/image] error", e);
    return NextResponse.json({ message: toMessage(e) }, { status: 500 });
  }
}
