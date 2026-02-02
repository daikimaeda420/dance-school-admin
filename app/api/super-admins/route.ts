// app/api/super-admins/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

function normalizeSchoolId(input: string) {
  const s = (input ?? "").trim().toLowerCase();
  if (!s) return "";
  // a-z 0-9 と - _ のみ許可（必要なら _ を外す）
  const cleaned = s
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  return cleaned;
}

// 認可チェック用
async function getCurrentSuperAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email?.toLowerCase() ?? "";

  if (!session || !userEmail) {
    return { session, userEmail, isSuperAdmin: false };
  }

  const admin = await prisma.superAdmin.findUnique({
    where: { email: userEmail },
  });

  return { session, userEmail, isSuperAdmin: !!admin };
}

export async function GET(req: NextRequest) {
  try {
    const { isSuperAdmin } = await getCurrentSuperAdmin(req);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "アクセス拒否" }, { status: 403 });
    }

    const admins = await prisma.superAdmin.findMany({
      select: { email: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      admins.map((a) => a.email),
      { status: 200 },
    );
  } catch (e: any) {
    console.error("GET /api/super-admins error", e);
    return NextResponse.json(
      { error: e?.message || "内部エラー" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, userEmail, isSuperAdmin } =
      await getCurrentSuperAdmin(req);

    if (!session || !userEmail) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "アクセス拒否" }, { status: 403 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "無効なJSON形式" }, { status: 400 });
    }

    const { action, email: targetEmailRaw, schoolId: schoolIdRaw } = body;

    if (!targetEmailRaw || !["add", "remove"].includes(action)) {
      return NextResponse.json({ error: "無効なリクエスト" }, { status: 400 });
    }

    const targetEmail = String(targetEmailRaw).trim().toLowerCase();
    if (!targetEmail) {
      return NextResponse.json(
        { error: "メールアドレスが不正です" },
        { status: 400 },
      );
    }

    if (action === "add") {
      const schoolId = normalizeSchoolId(String(schoolIdRaw ?? ""));
      if (!schoolId) {
        return NextResponse.json(
          { error: "schoolId が空です" },
          { status: 400 },
        );
      }
      if (schoolId.length > 40) {
        return NextResponse.json(
          { error: "schoolId が長すぎます（最大40文字）" },
          { status: 400 },
        );
      }

      await prisma.superAdmin.upsert({
        where: { email: targetEmail },
        update: { schoolId },
        create: { email: targetEmail, schoolId },
      });
    }

    if (action === "remove") {
      await prisma.superAdmin
        .delete({ where: { email: targetEmail } })
        .catch(() => {});
    }

    const admins = await prisma.superAdmin.findMany({
      select: { email: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      { superAdmins: admins.map((a) => a.email) },
      { status: 200 },
    );
  } catch (e: any) {
    console.error("POST /api/super-admins error", e);
    return NextResponse.json(
      { error: e?.message || "内部エラー" },
      { status: 500 },
    );
  }
}
