// app/api/diagnosis/genres/photo/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function placeholderSvg(text = "NO IMAGE") {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">
  <rect width="100%" height="100%" rx="24" fill="#E5E7EB"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="ui-sans-serif, system-ui" font-size="16" fill="#6B7280">
    ${text}
  </text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

// GET /api/diagnosis/genres/photo?id=xxx&schoolId=yyy
export async function GET(req: NextRequest) {
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

  // ✅ Q4(Genres) 廃止：DB参照はしない（img互換のためSVGを返す）
  return new NextResponse(placeholderSvg("DISABLED"), {
    status: 410, // Gone
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
