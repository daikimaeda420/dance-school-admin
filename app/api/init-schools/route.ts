import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPrincipal } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const principal = await getPrincipal();
  if (!principal) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const users = principal.isSuperAdmin
    ? await prisma.user.findMany({
        where: { role: UserRole.SCHOOL_ADMIN },
        select: { email: true, schoolId: true },
        orderBy: [{ schoolId: "asc" }, { email: "asc" }],
      })
    : await prisma.user.findMany({
        where: { role: UserRole.SCHOOL_ADMIN, schoolId: principal.schoolId },
        select: { email: true, schoolId: true },
        orderBy: [{ schoolId: "asc" }, { email: "asc" }],
      });

  const schools = users.reduce<Record<string, string[]>>((acc, user) => {
    if (!user.schoolId) return acc;
    acc[user.schoolId] ??= [];
    acc[user.schoolId].push(user.email);
    return acc;
  }, {});

  return NextResponse.json({
    ok: true,
    isSuperAdmin: principal.isSuperAdmin,
    schools,
  });
}
