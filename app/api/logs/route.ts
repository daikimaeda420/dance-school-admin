// app/api/logs/route.ts

import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const logPath = path.join(process.cwd(), "data", "faq-log.json");
const usersPath = path.join(process.cwd(), "data", "users.json");

// ログ読み込み（管理者用）
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email) {
    return new Response("未認証", { status: 401 });
  }

  try {
    const userData = await fs.readFile(usersPath, "utf8");
    const users = JSON.parse(userData);
    const user = users.find((u: any) => u.email === email);

    if (!user) return new Response("ユーザーが存在しません", { status: 403 });

    if (user.role !== "superadmin" && user.role !== "school-admin") {
      return new Response("アクセス拒否", { status: 403 });
    }

    const logFile = await fs.readFile(logPath, "utf8");
    const logs = JSON.parse(logFile);

    // ✅ 防御：配列でなければ空配列を返す
    if (!Array.isArray(logs)) {
      return Response.json([]);
    }

    return Response.json(logs);
  } catch (err) {
    console.error("ログ読み込みエラー:", err);
    return Response.json([], { status: 200 }); // ← ここも空配列で返すと安全
  }
}

// ログ保存（チャットボット用）
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { school, question, answer, url = "", timestamp, sessionId } = body;

    if (!school || !question || !timestamp || !sessionId) {
      return new Response("必要な項目が足りません", { status: 400 });
    }

    const newLog = {
      school,
      question,
      answer: answer ?? "",
      url: url ?? "",
      timestamp,
      sessionId,
    };

    const existing = await fs
      .readFile(logPath, "utf8")
      .then((data) => JSON.parse(data))
      .catch(() => []);

    existing.push(newLog);

    await fs.writeFile(logPath, JSON.stringify(existing, null, 2), "utf8");
    return new Response("保存成功", { status: 200 });
  } catch (err) {
    console.error("ログ保存エラー:", err);
    return new Response("ログ保存失敗", { status: 500 });
  }
}

// ログ削除（superadmin 限定）
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email) {
    return new Response("未認証", { status: 401 });
  }

  try {
    const userData = await fs.readFile(usersPath, "utf8");
    const users = JSON.parse(userData);
    const user = users.find((u: any) => u.email === email);

    if (!user || user.role !== "superadmin") {
      return new Response("アクセス拒否", { status: 403 });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return new Response("sessionId が必要です", { status: 400 });
    }

    const existing = await fs
      .readFile(logPath, "utf8")
      .then((data) => JSON.parse(data))
      .catch(() => []);

    const updated = existing.filter((log: any) => log.sessionId !== sessionId);

    await fs.writeFile(logPath, JSON.stringify(updated, null, 2), "utf8");
    return new Response("削除完了", { status: 200 });
  } catch (err) {
    console.error("ログ削除エラー:", err);
    return new Response("サーバーエラー", { status: 500 });
  }
}
