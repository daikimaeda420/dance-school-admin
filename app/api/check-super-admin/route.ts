import { getServerSession } from "next-auth"; // ← 追加
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  const isServiceAdmin = role === "service-admin";

  return new Response(JSON.stringify({ ok: isServiceAdmin }), { status: 200 });
}
