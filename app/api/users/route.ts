import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { hash } from "bcryptjs";

const USERS_PATH = path.join(process.cwd(), "data", "users.json");

export async function GET() {
  const usersRaw = await readFile(USERS_PATH, "utf-8");
  const users = JSON.parse(usersRaw);
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  try {
    const { email, name, password, role, schoolId } = await req.json();
    if (!email || !name || !password || !role) {
      return NextResponse.json({ error: "入力不備" }, { status: 400 });
    }

    const raw = await readFile(USERS_PATH, "utf-8");
    const users = JSON.parse(raw);

    if (users.some((u: any) => u.email === email)) {
      return NextResponse.json(
        { error: "そのメールアドレスは既に存在します" },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, 10);
    const newUser = { email, name, role, schoolId, passwordHash };
    users.push(newUser);

    await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf-8");

    return NextResponse.json({ ok: true, user: newUser });
  } catch (err) {
    console.error("❌ POST /api/users error:", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email)
    return NextResponse.json({ error: "メールが必要です" }, { status: 400 });

  const raw = await readFile(USERS_PATH, "utf-8");
  const users = JSON.parse(raw);
  const filtered = users.filter((u: any) => u.email !== email);

  await writeFile(USERS_PATH, JSON.stringify(filtered, null, 2), "utf-8");

  return NextResponse.json({ ok: true });
}
