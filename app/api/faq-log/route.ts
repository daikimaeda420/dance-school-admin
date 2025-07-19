// app/api/faq-log/route.ts
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: Request) {
  const log = await req.json();
  const logPath = path.join(process.cwd(), "public", "faq-log.json");

  try {
    const current = JSON.parse(await fs.readFile(logPath, "utf-8"));
    current.push(log);
    await fs.writeFile(logPath, JSON.stringify(current, null, 2));
    return new Response("OK", { status: 200 });
  } catch (err) {
    return new Response("ログ保存失敗", { status: 500 });
  }
}
