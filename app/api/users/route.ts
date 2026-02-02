// app/api/users/route.ts
import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

function normalizeSchoolId(input: string) {
  const s = (input ?? "").trim().toLowerCase();
  if (!s) return "";
  const cleaned = s
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  return cleaned;
}

// 共通: SuperAdmin かどうかチェック
async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions);
  const currentEmail = session?.user?.email?.toLowerCase().trim() ?? "";

  if (!session || !currentEmail) {
    return { session, currentEmail, isSuperAdmin: false };
  }

  // ① User テーブルの role で判定
  const user = await prisma.user.findUnique({
    where: { email: currentEmail },
  });

  const isUserSuperAdmin = user?.role === UserRole.SUPERADMIN;

  // ② SuperAdmin テーブルも念のためチェック
  const superAdminRow = await prisma.superAdmin.findUnique({
    where: { email: currentEmail },
  });

  let isSuperAdmin = isUserSuperAdmin || !!superAdminRow;

  // ③ User が SUPERADMIN なのに SuperAdmin テーブルに無ければ自動同期
  if (isUserSuperAdmin && !superAdminRow && user?.schoolId) {
    await prisma.superAdmin
      .upsert({
        where: { email: currentEmail },
        update: { schoolId: user.schoolId },
        create: { email: currentEmail, schoolId: user.schoolId },
      })
      .catch(() => {});
    isSuperAdmin = true;
  }

  return { session, currentEmail, isSuperAdmin };
}

// ユーザー一覧取得
export async function GET() {
  try {
    const { isSuperAdmin } = await ensureSuperAdmin();
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "アクセス権限がありません" }),
        { status: 403 },
      );
    }

    const dbUsers = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    });

    const users = dbUsers.map((u) => ({
      email: u.email,
      name: u.name,
      role: u.role === UserRole.SUPERADMIN ? "superadmin" : "school-admin",
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
        { status: 403 },
      );
    }

    const body = await req.json();
    const { email, name, password, role, schoolId: schoolIdRaw } = body ?? {};

    if (!email || !name || !password || !role) {
      return new Response(
        JSON.stringify({ error: "全ての項目を入力してください" }),
        { status: 400 },
      );
    }

    const emailLower = String(email).trim().toLowerCase();

    // ✅ ここが変更点：body.schoolId を優先。無ければ従来互換で @前
    const fallback = emailLower.split("@")[0] || "";
    const schoolId = normalizeSchoolId(
      schoolIdRaw ? String(schoolIdRaw) : fallback,
    );

    if (!schoolId) {
      return new Response(JSON.stringify({ error: "School ID が不正です" }), {
        status: 400,
      });
    }
    if (schoolId.length > 40) {
      return new Response(
        JSON.stringify({ error: "School ID が長すぎます（最大40文字）" }),
        { status: 400 },
      );
    }

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

    const passwordHash = await hash(String(password), 10);

    await prisma.user.create({
      data: {
        email: emailLower,
        name: String(name),
        role: dbRole,
        schoolId, // ✅ 手動指定が保存される
        passwordHash,
      },
    });

    // SUPERADMIN の場合は SuperAdmin テーブルにも同期（✅指定schoolIdで）
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
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get("email");
    if (!emailParam) {
      return new Response(
        JSON.stringify({ error: "メールアドレスが必要です" }),
        { status: 400 },
      );
    }

    const targetEmail = emailParam.toLowerCase().trim();

    if (currentEmail === targetEmail) {
      return new Response(
        JSON.stringify({ error: "自分自身のアカウントは削除できません" }),
        { status: 403 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: targetEmail },
    });
    if (!existing) {
      return new Response(
        JSON.stringify({ error: "ユーザーが見つかりません" }),
        { status: 404 },
      );
    }

    await prisma.user.delete({
      where: { email: targetEmail },
    });

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
        { status: 403 },
      );
    }

    const body = await req.json();
    const { email, name, password, role, schoolId: schoolIdRaw } = body ?? {};

    if (!email || !name || !role) {
      return new Response(
        JSON.stringify({ error: "必須項目が不足しています" }),
        { status: 400 },
      );
    }

    const emailLower = String(email).trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: emailLower },
    });
    if (!existing) {
      return new Response(
        JSON.stringify({ error: "ユーザーが見つかりません" }),
        { status: 404 },
      );
    }

    // ✅ ここが変更点：body.schoolId を優先。無ければ従来互換で @前
    const fallback = emailLower.split("@")[0] || "";
    const schoolId = normalizeSchoolId(
      schoolIdRaw ? String(schoolIdRaw) : fallback,
    );

    if (!schoolId) {
      return new Response(JSON.stringify({ error: "School ID が不正です" }), {
        status: 400,
      });
    }
    if (schoolId.length > 40) {
      return new Response(
        JSON.stringify({ error: "School ID が長すぎます（最大40文字）" }),
        { status: 400 },
      );
    }

    const dbRole =
      role === "superadmin" || role === "SUPERADMIN"
        ? UserRole.SUPERADMIN
        : UserRole.SCHOOL_ADMIN;

    const updateData: any = {
      name: String(name),
      role: dbRole,
      schoolId, // ✅ 手動指定が保存される
    };

    if (password) {
      updateData.passwordHash = await hash(String(password), 10);
    }

    await prisma.user.update({
      where: { email: emailLower },
      data: updateData,
    });

    // SUPERADMIN は SuperAdmin テーブルにも同期（✅指定schoolIdで）
    if (dbRole === UserRole.SUPERADMIN) {
      await prisma.superAdmin.upsert({
        where: { email: emailLower },
        update: { schoolId },
        create: { email: emailLower, schoolId },
      });
    } else {
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
