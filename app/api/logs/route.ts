// app/api/logs/route.ts
import { promises as fs } from "fs";
import path from "path";
import { getServerSession } from "next-auth";

const filePath = path.join(process.cwd(), "data", "faq-log.json");

export async function GET() {
  const session = await getServerSession();
  const email = session?.user?.email;

  if (!session || !email) {
    return new Response("未認証", { status: 401 });
  }

  const adminData = await fs.readFile(
    path.join(process.cwd(), "data", "admins.json"),
    "utf8"
  );
  const admins = JSON.parse(adminData);
  const allAdmins = new Set([
    ...(admins.superAdmins || []),
    ...Object.values(admins)
      .flat()
      .filter((x) => typeof x === "string"),
  ]);

  if (!allAdmins.has(email)) {
    return new Response("アクセス拒否", { status: 403 });
  }

  try {
    const file = await fs.readFile(filePath, "utf8");
    const logs = JSON.parse(file);
    return Response.json(logs);
  } catch (err) {
    return new Response("ログ読み込み失敗", { status: 500 });
  }
}
