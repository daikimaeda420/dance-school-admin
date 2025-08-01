// app/api/check-super-admin/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);

  // 型アサーションを追加
  const role = (session?.user as { role?: string })?.role;

  const isServiceAdmin = role === "service-admin";

  return new Response(JSON.stringify({ ok: isServiceAdmin }), { status: 200 });
}
