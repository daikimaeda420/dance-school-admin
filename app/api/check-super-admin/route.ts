import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);

  const user = session?.user as { role?: string }; // ここで型を補完

  const isServiceAdmin = user?.role === "service-admin";
  return new Response(JSON.stringify({ ok: isServiceAdmin }), { status: 200 });
}
