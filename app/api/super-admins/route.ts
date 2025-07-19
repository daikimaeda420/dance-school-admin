// app/api/super-admins/route.ts
import { promises as fs } from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const filePath = path.join(process.cwd(), "data", "admins.json");

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;

  if (!session || !userEmail) {
    return new Response(JSON.stringify({ error: "認証が必要です" }), {
      status: 401,
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "無効なJSON形式" }), {
      status: 400,
    });
  }

  const { action, email: targetEmail } = body;

  if (!targetEmail || !["add", "remove"].includes(action)) {
    return new Response(JSON.stringify({ error: "無効なリクエスト" }), {
      status: 400,
    });
  }

  const file = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(file);
  const superAdmins = data.superAdmins || [];

  if (!superAdmins.includes(userEmail)) {
    return new Response(JSON.stringify({ error: "アクセス拒否" }), {
      status: 403,
    });
  }

  if (action === "add" && !superAdmins.includes(targetEmail)) {
    superAdmins.push(targetEmail);
  } else if (action === "remove") {
    const index = superAdmins.indexOf(targetEmail);
    if (index !== -1) {
      superAdmins.splice(index, 1);
    }
  }

  await fs.writeFile(filePath, JSON.stringify({ superAdmins }, null, 2));

  return new Response(JSON.stringify({ superAdmins }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
