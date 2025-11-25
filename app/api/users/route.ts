// app/api/users/route.ts

import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// 共通: SuperAdmin かどうかチェック
async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions);
  const currentEmail = session?.user?.email?.toLowerCase() ?? "";

  if (!session || !currentEmail) {
    return { session, currentEmail, isSuperAdmin: false };
  }

  const superAdmin = await prisma.superAdmin.findUnique({
    where: { email: currentEmail },
  });

  return { session, currentEmail, isSuperAdmin: !!superAdmin };
}

// ユーザー一覧取得
export async function GET() {
  try {
    const { isSuperAdmin } = await ensureSuperAdmin();
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "アクセス権限がありません" }),
        { status: 403 }
      );
    }

    const dbUsers = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    });

    // パスワードハッシュは返さず、role は従来の文字列に戻す
    const users = dbUsers.map((u) => ({
      email: u.email,
      name: u.name,
      role: u.role === "SUPERADMIN" ? "superadmin" : "school-admin",
      schoolId: u.schoolId,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    return new Response(JSON.stringify({ users }), { status: 200 });
  } catch (err) {
    console.error("GET /api/users エラー:", err);
    return new Response(JSON.stringify({ error: "ユーザー取得失敗" }), {
      status: 500,
    });
  }
}

// ユーザー追加
export async function POST(req: NextRequest) {
  try {
    const { isSuperAdmin } = await ensureSuperAdmin();
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "アクセス権限がありません" }),
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, name, password, role } = body;

    if (!email || !name || !password || !role) {
      return new Response(
        JSON.stringify({ error: "全ての項目を入力してください" }),
        { status: 400 }
      );
    }

    const emailLower = String(email).trim().toLowerCase();
    const schoolId = emailLower.split("@")[0];

    // role 文字列 → enum
    const dbRole =
      role === "superadmin" || role === "SUPERADMIN"
        ? UserRole.SUPERADMIN
        : UserRole.SCHOOL_ADMIN;

    const existing = await prisma.user.findUnique({
      where: { email: emailLower },
    });
    if (existing) {
      return new Response(JSON.stringify({ error: "既に登録されています" }), {
        status: 400,
      });
    }

    const passwordHash = await hash(password, 10);

    await prisma.user.create({
      data: {
        email: emailLower,
        name,
        role: dbRole,
        schoolId,
        passwordHash,
      },
    });

    // SUPERADMIN の場合は SuperAdmin テーブルにも同期
    if (dbRole === UserRole.SUPERADMIN) {
      await prisma.superAdmin.upsert({
        where: { email: emailLower },
        update: { schoolId },
        create: { email: emailLower, schoolId },
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("POST /api/users エラー:", err);
    return new Response(JSON.stringify({ error: "追加に失敗しました" }), {
      status: 500,
    });
  }
}

// ユーザー削除
export async function DELETE(req: NextRequest) {
  try {
    const { session, currentEmail, isSuperAdmin } = await ensureSuperAdmin();
    if (!session || !currentEmail) {
      return new Response(JSON.stringify({ error: "ログインが必要です" }), {
        status: 401,
      });
    }
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "アクセス権限がありません" }),
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get("email");
    if (!emailParam) {
      return new Response(
        JSON.stringify({ error: "メールアドレスが必要です" }),
        { status: 400 }
      );
    }

    const targetEmail = emailParam.toLowerCase();

    if (currentEmail === targetEmail) {
      return new Response(
        JSON.stringify({ error: "自分自身のアカウントは削除できません" }),
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: targetEmail },
    });
    if (!existing) {
      return new Response(
        JSON.stringify({ error: "ユーザーが見つかりません" }),
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { email: targetEmail },
    });

    // SUPERADMIN テーブルからも削除（存在しなくても OK）
    await prisma.superAdmin
      .delete({ where: { email: targetEmail } })
      .catch(() => {});

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("DELETE /api/users エラー:", err);
    return new Response(JSON.stringify({ error: "削除に失敗しました" }), {
      status: 500,
    });
  }
}

// ユーザー更新
export async function PUT(req: NextRequest) {
  try {
    const { isSuperAdmin } = await ensureSuperAdmin();
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "アクセス権限がありません" }),
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, name, password, role } = body;

    if (!email || !name || !role) {
      return new Response(
        JSON.stringify({ error: "必須項目が不足しています" }),
        { status: 400 }
      );
    }

    const emailLower = String(email).trim().toLowerCase();
    const schoolId = emailLower.split("@")[0];

    const existing = await prisma.user.findUnique({
      where: { email: emailLower },
    });
    if (!existing) {
      return new Response(
        JSON.stringify({ error: "ユーザーが見つかりません" }),
        { status: 404 }
      );
    }

    const dbRole =
      role === "superadmin" || role === "SUPERADMIN"
        ? UserRole.SUPERADMIN
        : UserRole.SCHOOL_ADMIN;

    const updateData: any = {
      name,
      role: dbRole,
      schoolId,
    };

    if (password) {
      updateData.passwordHash = await hash(password, 10);
    }

    await prisma.user.update({
      where: { email: emailLower },
      data: updateData,
    });

    // SUPERADMIN テーブル同期
    if (dbRole === UserRole.SUPERADMIN) {
      await prisma.superAdmin.upsert({
        where: { email: emailLower },
        update: { schoolId },
        create: { email: emailLower, schoolId },
      });
    } else {
      // SUPERADMIN → SCHOOL_ADMIN に落とした場合は SuperAdmin から削除
      await prisma.superAdmin
        .delete({ where: { email: emailLower } })
        .catch(() => {});
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("PUT /api/users エラー:", err);
    return new Response(JSON.stringify({ error: "更新に失敗しました" }), {
      status: 500,
    });
  }
}
