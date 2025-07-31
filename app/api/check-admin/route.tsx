// app/api/check-admin/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);
  const roles = session?.user?.roles ?? [];

  const isSchoolAdmin = roles.includes("school-admin");
  return new Response(JSON.stringify({ ok: isSchoolAdmin }), { status: 200 });
}
