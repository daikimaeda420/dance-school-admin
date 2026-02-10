// app/api/diagnosis/genres/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * ✅ Q4(好みの音楽・雰囲気)廃止により genres APIは無効化
 * GET: 互換のため空配列
 * POST/PUT/DELETE: 410 Gone
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json([]);
}

export async function POST() {
  return NextResponse.json(
    { message: "Genres(Q4) は廃止されました" },
    { status: 410 },
  );
}

export async function PUT() {
  return NextResponse.json(
    { message: "Genres(Q4) は廃止されました" },
    { status: 410 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { message: "Genres(Q4) は廃止されました" },
    { status: 410 },
  );
}
