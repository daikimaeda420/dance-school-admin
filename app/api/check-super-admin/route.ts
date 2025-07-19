// app/api/check-super-admin/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { promises as fs } from "fs";
import path from "path";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email) {
    return new Response(JSON.stringify({ ok: false }), { status: 401 });
  }

  const file = await fs.readFile(
    path.join(process.cwd(), "data", "admins.json"),
    "utf8"
  );
  const { superAdmins } = JSON.parse(file);

  const isSuperAdmin = superAdmins.includes(email);

  return new Response(JSON.stringify({ ok: isSuperAdmin }), { status: 200 });
}
