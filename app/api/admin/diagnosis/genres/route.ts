// app/api/admin/diagnosis/genres/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  return session?.user?.email ? session : null;
}

function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

/**
 * ✅ Q4(好みの音楽・雰囲気)廃止により genres 管理APIは無効化
 * GET: 互換のため空配列
 * POST/PUT/DELETE: 410 Gone
 */
export async function GET(_req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) return json("Unauthorized", 401);
  return NextResponse.json([]);
}

export async function POST() {
  const session = await ensureLoggedIn();
  if (!session) return json("Unauthorized", 401);
  return json("Genres(Q4) は廃止されました", 410);
}

export async function PUT() {
  const session = await ensureLoggedIn();
  if (!session) return json("Unauthorized", 401);
  return json("Genres(Q4) は廃止されました", 410);
}

export async function DELETE() {
  const session = await ensureLoggedIn();
  if (!session) return json("Unauthorized", 401);
  return json("Genres(Q4) は廃止されました", 410);
}
