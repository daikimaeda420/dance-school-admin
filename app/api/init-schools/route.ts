import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const adminsRaw = await fs.readFile(
    path.join(process.cwd(), "data", "admins.json"),
    "utf8"
  );
  const { superAdmins } = JSON.parse(adminsRaw);
  const isSuperAdmin = superAdmins.includes(email);

  const schoolsRaw = await fs.readFile(
    path.join(process.cwd(), "data", "schools.json"),
    "utf8"
  );
  const schools = JSON.parse(schoolsRaw);

  return NextResponse.json({
    ok: true,
    isSuperAdmin,
    schools,
  });
}
