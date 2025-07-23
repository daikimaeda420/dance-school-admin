import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { readFile, writeFile } from "fs/promises";
import path from "path";

const USERS_PATH = path.join(process.cwd(), "data", "users.json");

export async function POST(
  req: Request,
  { params }: { params: { schoolId: string } }
) {
  try {
    const { email, name, password } = await req.json();
    const schoolId = params.schoolId;

    if (!email || !name || !password || !schoolId) {
      return NextResponse.json({ error: "不正な入力です" }, { status: 400 });
    }

    // JSONファイル読み込み
    const usersRaw = await readFile(USERS_PATH, "utf-8");
    const users = JSON.parse(usersRaw);

    // 重複チェック（email一致）
    if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json(
        { error: "そのメールアドレスは既に存在します" },
        { status: 400 }
      );
    }

    // パスワードをハッシュ化
    const passwordHash = await hash(password, 10);

    // 新しいユーザーオブジェクト
    const newUser = {
      email,
      name,
      passwordHash,
      role: "school-admin",
      schoolId,
    };

    users.push(newUser);

    // JSONファイルに書き戻す
    await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf-8");

    return NextResponse.json({
      ok: true,
      user: { email, name, role: "school-admin", schoolId },
    });
  } catch (error) {
    console.error("❌ Error adding school-admin:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
