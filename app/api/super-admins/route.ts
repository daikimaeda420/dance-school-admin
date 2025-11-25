// app/api/super-admins/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

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

// SuperAdmin 一覧取得（フロントの useEffect で使う）
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

    // SuperAdminEditor 側は string[] を想定しているのでメールだけ返す
    return NextResponse.json(
      admins.map((a) => a.email),
      {
        status: 200,
      }
    );
  } catch (e: any) {
    console.error("GET /api/super-admins error", e);
    return NextResponse.json(
      { error: e?.message || "内部エラー" },
      { status: 500 }
    );
  }
}

// 追加・削除
export async function POST(req: NextRequest) {
  try {
    const { session, userEmail, isSuperAdmin } = await getCurrentSuperAdmin(
      req
    );

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
    const schoolId = (schoolIdRaw ? String(schoolIdRaw) : "").trim();

    if (!targetEmail) {
      return NextResponse.json(
        { error: "メールアドレスが不正です" },
        { status: 400 }
      );
    }

    if (action === "add") {
      if (!schoolId) {
        return NextResponse.json(
          { error: "schoolId が空です" },
          { status: 400 }
        );
      }

      // 既存なら schoolId 更新、なければ新規作成
      await prisma.superAdmin.upsert({
        where: { email: targetEmail },
        update: { schoolId },
        create: { email: targetEmail, schoolId },
      });
    } else if (action === "remove") {
      // 無くてもエラーにしない
      await prisma.superAdmin
        .delete({
          where: { email: targetEmail },
        })
        .catch(() => {});
    }

    // 最新一覧を返しておく（今のフロントは text として無視しても OK）
    const admins = await prisma.superAdmin.findMany({
      select: { email: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      { superAdmins: admins.map((a) => a.email) },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("POST /api/super-admins error", e);
    return NextResponse.json(
      { error: e?.message || "内部エラー" },
      { status: 500 }
    );
  }
}
