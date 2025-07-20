import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

const filePath = path.join(process.cwd(), "data", "schools.json");

export async function GET(req: NextRequest) {
  const session = await getServerSession();
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

    console.log("チェック対象email:", email);
    console.log("schools:", schools);
    console.log("一致するか？", isAdmin);

    return NextResponse.json({ ok: isAdmin, email, schools });
  } catch (err) {
    console.error("チェック中にエラー:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
