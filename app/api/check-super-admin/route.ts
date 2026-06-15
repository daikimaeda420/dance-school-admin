import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);

  const user = session?.user as { role?: string }; // ここで型を補完

  const isSuperAdmin =
    user?.role === UserRole.SUPERADMIN ||
    user?.role === "superadmin" ||
    user?.role === "service-admin";
  return NextResponse.json({ ok: isSuperAdmin }, { status: 200 });
}
