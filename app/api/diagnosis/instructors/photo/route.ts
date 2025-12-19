// app/api/diagnosis/instructors/photo/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();
  const schoolId = searchParams.get("schoolId")?.trim();

  if (!id || !schoolId) {
    return new Response("id / schoolId required", { status: 400 });
  }

  const row = await prisma.diagnosisInstructor.findFirst({
    where: { id, schoolId },
    select: { photoData: true, photoMime: true },
  });

  if (!row?.photoData || !row.photoMime) {
    return new Response("Not Found", { status: 404 });
  }

  // Prisma Bytes は Uint8Array として扱える
  const bytes = row.photoData as unknown as Uint8Array;

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": row.photoMime,
      "Cache-Control": "no-store",
    },
  });
}
