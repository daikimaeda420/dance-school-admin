// app/api/logs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const logPath = path.join(process.cwd(), "data", "faq-log.json");
const usersPath = path.join(process.cwd(), "data", "users.json");

// 共通: users 読み込み
async function readUsers() {
  const userData = await fs.readFile(usersPath, "utf8");
  const users = JSON.parse(userData);
  return Array.isArray(users) ? users : [];
}

// 共通: logs 読み込み（ファイルがない・壊れている場合も空配列）
async function readLogs() {
  const data = await fs.readFile(logPath, "utf8").catch(() => "[]"); // ファイルがないときは空配列扱い

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    parsed = [];
  }

  return Array.isArray(parsed) ? parsed : [];
}

// 共通: logs 書き込み（親ディレクトリがなくても作る）
async function writeLogs(logs: any[]) {
  const dir = path.dirname(logPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(logPath, JSON.stringify(logs, null, 2), "utf8");
}

// ログ読み込み（管理者用）
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email) {
    return NextResponse.json({ message: "未認証" }, { status: 401 });
  }

  try {
    const users = await readUsers();
    const user = users.find((u: any) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { message: "ユーザーが存在しません" },
        { status: 403 }
      );
    }

    let logs = await readLogs();

    // school-admin は自分の school だけ / superadmin は全部
    if (user.role === "school-admin") {
      if (user.schoolId) {
        logs = logs.filter((log: any) => log.school === user.schoolId);
      } else {
        logs = [];
      }
    } else if (user.role !== "superadmin") {
      return NextResponse.json({ message: "アクセス拒否" }, { status: 403 });
    }

    // timestamp の新しい順にソート
    logs.sort((a: any, b: any) => {
      const ta = new Date(a.timestamp).getTime() || 0;
      const tb = new Date(b.timestamp).getTime() || 0;
      return tb - ta;
    });

    // フロント側は配列を受ける実装なのでそのまま配列を返す
    return NextResponse.json(logs);
  } catch (err) {
    console.error("ログ読み込みエラー:", err);
    // エラー時も一旦空配列（フロントでは「まだログがありません」表示）
    return NextResponse.json([], { status: 200 });
  }
}

// ログ保存（チャットボット用）
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

    const newLog = {
      school,
      question,
      answer: answer ?? "",
      url: url ?? "",
      timestamp,
      sessionId,
    };

    const existing = await readLogs();
    existing.push(newLog);

    await writeLogs(existing);

    return NextResponse.json({ message: "保存成功" }, { status: 200 });
  } catch (err) {
    console.error("ログ保存エラー:", err);
    return NextResponse.json({ message: "ログ保存失敗" }, { status: 500 });
  }
}

// ログ削除（superadmin 限定）
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email) {
    return NextResponse.json({ message: "未認証" }, { status: 401 });
  }

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

    const existing = await readLogs();
    const updated = existing.filter((log: any) => log.sessionId !== sessionId);

    await writeLogs(updated);

    return NextResponse.json({ message: "削除完了" }, { status: 200 });
  } catch (err) {
    console.error("ログ削除エラー:", err);
    return NextResponse.json({ message: "サーバーエラー" }, { status: 500 });
  }
}
