import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  const isSchoolAdmin = role === "school-admin";
  return new Response(JSON.stringify({ ok: isSchoolAdmin }), { status: 200 });
}
