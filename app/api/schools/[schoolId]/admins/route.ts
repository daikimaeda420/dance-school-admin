import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSchoolId, requireSuperAdmin } from "@/lib/authz";

export const runtime = "nodejs";

function json(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { email, name, password } = await req.json().catch(() => ({}));
    const { schoolId: rawSchoolId } = await params;
    const schoolId = normalizeSchoolId(rawSchoolId);
    const emailLower = String(email ?? "").trim().toLowerCase();
    const displayName = String(name ?? "").trim();
    const rawPassword = String(password ?? "");

    if (!emailLower || !displayName || !rawPassword || !schoolId) {
      return json("不正な入力です", 400);
    }

    const passwordHash = await hash(rawPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: emailLower,
        name: displayName,
        passwordHash,
        role: UserRole.SCHOOL_ADMIN,
        schoolId,
      },
      select: { email: true, name: true, role: true, schoolId: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return json("そのメールアドレスは既に存在します", 409);
    }
    console.error("Error adding school-admin:", error);
    return json("サーバーエラー", 500);
  }
}
