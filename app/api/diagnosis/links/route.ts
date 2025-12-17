import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type LinkType = "genres" | "courses" | "campuses" | "instructors";

/**
 * Prisma自動生成の中間テーブル（A/B）を直接操作するAPI
 *
 * ✅ 確定：
 *  - A = DiagnosisResult.id
 *  - B = Option.id（Genre/Course/Campus/Instructor）
 */
const map = {
  genres: { table: "_ResultGenres" },
  courses: { table: "_ResultCourses" },
  campuses: { table: "_ResultCampuses" },
  instructors: { table: "_ResultInstructors" },
} as const;

function isLinkType(x: string | null): x is LinkType {
  return (
    x === "genres" || x === "courses" || x === "campuses" || x === "instructors"
  );
}

/**
 * GET /api/diagnosis/links?type=genres&resultId=xxx
 * -> その resultId に紐づく optionId（=B）一覧を返す
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const typeParam = searchParams.get("type");
  const resultId = searchParams.get("resultId") ?? "";

  if (!isLinkType(typeParam) || !resultId) {
    return NextResponse.json(
      { message: "type/resultId required" },
      { status: 400 }
    );
  }

  const table = map[typeParam].table;

  const rows = await prisma.$queryRawUnsafe<{ B: string }[]>(
    `select "B" from public."${table}" where "A" = $1`,
    resultId
  );

  return NextResponse.json(rows.map((r) => r.B));
}

/**
 * POST /api/diagnosis/links
 * body: { type, resultId, optionId }
 * -> 紐づけ追加（A=resultId, B=optionId）
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const typeParam = body?.type as string | undefined;
  const resultId = (body?.resultId ?? "") as string;
  const optionId = (body?.optionId ?? "") as string;

  if (!isLinkType(typeParam) || !resultId || !optionId) {
    return NextResponse.json(
      { message: "type/resultId/optionId required" },
      { status: 400 }
    );
  }

  const table = map[typeParam].table;

  await prisma.$executeRawUnsafe(
    `insert into public."${table}" ("A","B") values ($1,$2) on conflict do nothing`,
    resultId,
    optionId
  );

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/diagnosis/links?type=genres&resultId=xxx&optionId=yyy
 * -> 紐づけ削除
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const typeParam = searchParams.get("type");
  const resultId = searchParams.get("resultId") ?? "";
  const optionId = searchParams.get("optionId") ?? "";

  if (!isLinkType(typeParam) || !resultId || !optionId) {
    return NextResponse.json(
      { message: "type/resultId/optionId required" },
      { status: 400 }
    );
  }

  const table = map[typeParam].table;

  await prisma.$executeRawUnsafe(
    `delete from public."${table}" where "A" = $1 and "B" = $2`,
    resultId,
    optionId
  );

  return NextResponse.json({ ok: true });
}
