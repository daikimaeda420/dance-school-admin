import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  const session = await getServerSession(authOptions);

  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const adminsFile = await fs.readFile(
      path.join(process.cwd(), "data", "admins.json"),
      "utf8"
    );
    const { superAdmins } = JSON.parse(adminsFile);
    const isSuperAdmin = superAdmins.includes(email);

    const schoolsFile = await fs.readFile(
      path.join(process.cwd(), "data", "schools.json"),
      "utf8"
    );
    const schools = JSON.parse(schoolsFile);

    return NextResponse.json({ ok: true, isSuperAdmin, schools });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Failed to load data" },
      { status: 500 }
    );
  }
}
