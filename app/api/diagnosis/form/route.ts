import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/diagnosis/form?schoolId=xxx
 * 診断結果ページ用（公開）
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");

  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId is required" },
      { status: 400 },
    );
  }

  const form = await prisma.diagnosisForm.findUnique({
    where: { schoolId },
    include: {
      fields: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!form || !form.isActive) {
    return NextResponse.json(null);
  }

  const isClassField = (label: string) =>
    ["体験クラス", "体験コース", "クラス", "コース"].some((k) => label.includes(k));

  const hasClassField = form.fields.some((f) => !!f.label && isClassField(f.label));

  if (!hasClassField) {
    form.fields.push({
      id: "virtual-class-field",
      formId: form.id,
      label: "体験コース",
      type: "SELECT",
      required: true,
      optionsJson: null,
      placeholder: null,
      sortOrder: 9999,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return NextResponse.json(form);
}
