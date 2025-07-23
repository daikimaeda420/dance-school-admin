import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions"; // ← ご自身のパスに合わせて
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const file = await fs.readFile(
      path.join(process.cwd(), "data", "admins.json"),
      "utf8"
    );
    const { superAdmins = [] } = JSON.parse(file);

    const isSuperAdmin = superAdmins
      .map((e: string) => e.toLowerCase())
      .includes(email.toLowerCase());

    return new Response(JSON.stringify({ ok: isSuperAdmin }), {
      status: 200,
    });
  } catch (error) {
    console.error("check-super-admin error:", error);
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), {
      status: 500,
    });
  }
}
