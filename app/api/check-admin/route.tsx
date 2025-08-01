import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  // 型を明示する（TypeScriptにroleがあると伝える）
  const user = session?.user as { role?: string };

  const isSchoolAdmin = user?.role === "school-admin";
  return new Response(JSON.stringify({ ok: isSchoolAdmin }), { status: 200 });
}
