import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRecordSchoolAccess } from "@/lib/authz";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });

  const access = await requireRecordSchoolAccess(
    () =>
      prisma.diagnosisInstructor.findUnique({
        where: { id },
        select: { schoolId: true },
      }),
    "対象の講師が見つかりません",
  );
  if (!access.ok) return access.response;

  const updated = await prisma.diagnosisInstructor.update({
    where: { id },
    data: {
      label: typeof body.label === "string" ? body.label : undefined, // ✅ name -> label
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireRecordSchoolAccess(
    () =>
      prisma.diagnosisInstructor.findUnique({
        where: { id },
        select: { schoolId: true },
      }),
    "対象の講師が見つかりません",
  );
  if (!access.ok) return access.response;

  await prisma.diagnosisInstructor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
