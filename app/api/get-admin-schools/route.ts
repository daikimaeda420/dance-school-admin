import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPrincipal } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const principal = await getPrincipal();
  if (!principal) {
    return NextResponse.json({ schools: [] }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requestedEmail = searchParams.get("email")?.toLowerCase().trim() || "";

  if (requestedEmail && requestedEmail !== principal.email && !principal.isSuperAdmin) {
    return NextResponse.json({ schools: [] }, { status: 403 });
  }

  const email = requestedEmail || principal.email;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, schoolId: true },
  });

  if (!user) return NextResponse.json({ schools: [] }, { status: 200 });

  if (user.role === UserRole.SUPERADMIN || principal.isSuperAdmin) {
    const rows = await prisma.user.findMany({
      distinct: ["schoolId"],
      select: { schoolId: true },
      orderBy: { schoolId: "asc" },
    });
    return NextResponse.json({
      schools: rows.map((r) => r.schoolId).filter(Boolean),
    });
  }

  return NextResponse.json({ schools: user.schoolId ? [user.schoolId] : [] });
}
