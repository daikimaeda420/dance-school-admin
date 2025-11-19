// app/api/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";
import path from "path";

// users.json のパス（そのまま利用）
const usersPath = path.join(process.cwd(), "data", "users.json");

// ------------------------------
// 共通: users.json 読み込み
// ------------------------------
async function readUsers() {
  const json = await fs.readFile(usersPath, "utf8").catch(() => "[]");
  try {
    const users = JSON.parse(json);
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

// ------------------------------
// GET: ログ読み込み（管理画面用）
// ------------------------------
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email)
    return NextResponse.json({ message: "未認証" }, { status: 401 });

  try {
    const users = await readUsers();
    const user = users.find((u: any) => u.email === email);

    if (!user)
      return NextResponse.json(
        { message: "ユーザーが存在しません" },
        { status: 403 }
      );

    // フィルタ条件
    let where: any = {};

    if (user.role === "school-admin") {
      if (!user.schoolId) {
        return NextResponse.json([], { status: 200 });
      }
      where.school = user.schoolId;
    } else if (user.role !== "superadmin") {
      return NextResponse.json({ message: "アクセス拒否" }, { status: 403 });
    }

    // DB から取得
    const logs = await prisma.faqLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 2000, // 必要であれば上限を設定
    });

    return NextResponse.json(logs);
  } catch (err) {
    console.error("ログ読み込みエラー:", err);
    return NextResponse.json([], { status: 200 });
  }
}

// ------------------------------
// POST: ログ保存（チャットボット用）
// ------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { school, question, answer, url = "", timestamp, sessionId } = body;

    if (!school || !question || !timestamp || !sessionId) {
      return NextResponse.json(
        { message: "必要な項目が足りません" },
        { status: 400 }
      );
    }

    // timestamp を Date に変換
    const ts = new Date(timestamp);
    if (Number.isNaN(ts.getTime())) {
      return NextResponse.json(
        { message: "timestamp が不正です" },
        { status: 400 }
      );
    }

    await prisma.faqLog.create({
      data: {
        school,
        question:
          typeof question === "string" ? question : JSON.stringify(question),
        answer: answer
          ? typeof answer === "string"
            ? answer
            : JSON.stringify(answer)
          : "",
        url: url || null,
        timestamp: ts,
        sessionId,
      },
    });

    return NextResponse.json({ message: "保存成功" }, { status: 200 });
  } catch (err) {
    console.error("ログ保存エラー:", err);
    return NextResponse.json({ message: "ログ保存失敗" }, { status: 500 });
  }
}

// ------------------------------
// DELETE: セッション単位で削除（superadmin 限定）
// ------------------------------
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email)
    return NextResponse.json({ message: "未認証" }, { status: 401 });

  try {
    const users = await readUsers();
    const user = users.find((u: any) => u.email === email);

    if (!user || user.role !== "superadmin") {
      return NextResponse.json({ message: "アクセス拒否" }, { status: 403 });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json(
        { message: "sessionId が必要です" },
        { status: 400 }
      );
    }

    await prisma.faqLog.deleteMany({
      where: { sessionId },
    });

    return NextResponse.json({ message: "削除完了" }, { status: 200 });
  } catch (err) {
    console.error("ログ削除エラー:", err);
    return NextResponse.json({ message: "サーバーエラー" }, { status: 500 });
  }
}
