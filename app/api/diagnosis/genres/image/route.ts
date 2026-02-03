// app/api/diagnosis/genres/image/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// 画像が無い場合のプレースホルダー（SVG）
function placeholderSvg(text = "NO IMAGE") {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">
  <rect width="100%" height="100%" rx="24" fill="#E5E7EB"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="ui-sans-serif, system-ui" font-size="18" fill="#6B7280">
    ${text}
  </text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

// GET /api/diagnosis/genres/image?id=xxx&schoolId=yyy
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "").trim();
    const schoolId = String(searchParams.get("schoolId") ?? "").trim();

    if (!id || !schoolId) {
      return new NextResponse(placeholderSvg("BAD REQUEST"), {
        status: 400,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const row = await prisma.diagnosisGenre.findFirst({
      where: { id, schoolId },
      select: {
        photoData: true,
        photoMime: true,
        updatedAt: true,
      },
    });

    if (!row?.photoData || !row.photoMime) {
      return new NextResponse(placeholderSvg("NO IMAGE"), {
        status: 404,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          // 画像が無い場合は短めキャッシュでOK
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // Prisma Bytes -> Buffer
    const buf =
      row.photoData instanceof Buffer
        ? row.photoData
        : Buffer.from(row.photoData as any);

    // キャッシュ：更新されない限り同じ画像になるので強めでOK
    // ※更新時は URL に &v=updatedAt を付ける運用にすると確実
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": row.photoMime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("[GET /api/diagnosis/genres/image] error", e);
    return new NextResponse(placeholderSvg("ERROR"), {
      status: 500,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
