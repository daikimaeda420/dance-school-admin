// app/api/schools/route.ts
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSchoolId, requireSuperAdmin } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

async function ensureSuperAdminResponse() {
  const auth = await requireSuperAdmin();
  return auth.ok ? null : auth.response;
}

export async function GET() {
  const denied = await ensureSuperAdminResponse();
  if (denied) return denied;

  const users = await prisma.user.findMany({
    where: { role: UserRole.SCHOOL_ADMIN },
    select: { email: true, schoolId: true },
    orderBy: [{ schoolId: "asc" }, { email: "asc" }],
  });

  const schools = users.reduce<Record<string, string[]>>((acc, user) => {
    const schoolId = normalizeSchoolId(user.schoolId);
    if (!schoolId) return acc;
    acc[schoolId] ??= [];
    acc[schoolId].push(user.email);
    return acc;
  }, {});

  return NextResponse.json(schools);
}

export async function POST() {
  const denied = await ensureSuperAdminResponse();
  if (denied) return denied;
  return json("この旧APIでの学校追加は廃止されました。/api/users を使用してください。", 410);
}

export async function PATCH() {
  const denied = await ensureSuperAdminResponse();
  if (denied) return denied;
  return json("この旧APIでの学校更新は廃止されました。/api/users を使用してください。", 410);
}

export async function DELETE() {
  const denied = await ensureSuperAdminResponse();
  if (denied) return denied;
  return json("この旧APIでの学校削除は廃止されました。/api/users を使用してください。", 410);
}
