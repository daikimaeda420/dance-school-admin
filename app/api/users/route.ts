import { NextRequest } from "next/server";
import path from "path";
import { readFile, writeFile } from "fs/promises";
import { hash } from "bcryptjs";
import { getServerSession } from "next-auth"; // ✅ 追加
import { authOptions } from "@/lib/authOptions"; // ✅ あなたのプロジェクトに合わせて調整

const filePath = path.join(process.cwd(), "data", "users.json");

export async function GET() {
  try {
    const data = await readFile(filePath, "utf8");
    const users = JSON.parse(data);
    return new Response(JSON.stringify({ users }), { status: 200 });
  } catch (err) {
    console.error("GET /api/users エラー:", err);
    return new Response(JSON.stringify({ error: "ユーザー取得失敗" }), {
      status: 500,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, password, role } = body;

    if (!email || !name || !password || !role) {
      return new Response(
        JSON.stringify({ error: "全ての項目を入力してください" }),
        { status: 400 }
      );
    }

    const schoolId = email.split("@")[0];

    const raw = await readFile(filePath, "utf8");
    const users = JSON.parse(raw);

    const existing = users.find((u: any) => u.email === email);
    if (existing) {
      return new Response(JSON.stringify({ error: "既に登録されています" }), {
        status: 400,
      });
    }

    const passwordHash = await hash(password, 10);

    const newUser = {
      email,
      name,
      role,
      schoolId,
      passwordHash,
    };

    users.push(newUser);
    await writeFile(filePath, JSON.stringify(users, null, 2), "utf8");

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("POST /api/users エラー:", err);
    return new Response(JSON.stringify({ error: "追加に失敗しました" }), {
      status: 500,
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    if (!email) {
      return new Response(
        JSON.stringify({ error: "メールアドレスが必要です" }),
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions); // ✅ 現在のログインユーザー取得
    const currentEmail = session?.user?.email;

    if (currentEmail === email) {
      return new Response(
        JSON.stringify({ error: "自分自身のアカウントは削除できません" }),
        { status: 403 }
      );
    }

    const raw = await readFile(filePath, "utf8");
    const users = JSON.parse(raw);

    const updated = users.filter((u: any) => u.email !== email);
    if (updated.length === users.length) {
      return new Response(
        JSON.stringify({ error: "ユーザーが見つかりません" }),
        { status: 404 }
      );
    }

    await writeFile(filePath, JSON.stringify(updated, null, 2), "utf8");

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("DELETE /api/users エラー:", err);
    return new Response(JSON.stringify({ error: "削除に失敗しました" }), {
      status: 500,
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, password, role } = body;

    if (!email || !name || !role) {
      return new Response(
        JSON.stringify({ error: "必須項目が不足しています" }),
        {
          status: 400,
        }
      );
    }

    const raw = await readFile(filePath, "utf8");
    const users = JSON.parse(raw);
    const index = users.findIndex((u: any) => u.email === email);

    if (index === -1) {
      return new Response(
        JSON.stringify({ error: "ユーザーが見つかりません" }),
        {
          status: 404,
        }
      );
    }

    users[index].name = name;
    users[index].role = role;
    users[index].schoolId = email.split("@")[0];

    if (password) {
      users[index].passwordHash = await hash(password, 10);
    }

    await writeFile(filePath, JSON.stringify(users, null, 2), "utf8");
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("PUT /api/users エラー:", err);
    return new Response(JSON.stringify({ error: "更新に失敗しました" }), {
      status: 500,
    });
  }
}
