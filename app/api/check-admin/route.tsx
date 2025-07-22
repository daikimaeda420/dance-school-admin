import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions"; // ✅ 明示的に必要！

const filePath = path.join(process.cwd(), "data", "schools.json");

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions); // ✅ authOptions 必須
  const email = session?.user?.email;

  if (!session || !email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const data = await fs.readFile(filePath, "utf8");
    const schools = JSON.parse(data);

    const isAdmin = Object.values(schools).some((admins: string[]) =>
      admins.map((a) => a.toLowerCase()).includes(email.toLowerCase())
    );

    return NextResponse.json({ ok: isAdmin });
  } catch (err) {
    console.error("チェック中にエラー:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
