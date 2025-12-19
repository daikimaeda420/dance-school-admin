import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await ensureLoggedIn();
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });

  const updated = await prisma.diagnosisInstructor.update({
    where: { id: params.id },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      sortOrder:
        typeof body.sortOrder === "number" ? body.sortOrder : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await ensureLoggedIn();
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await prisma.diagnosisInstructor.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
