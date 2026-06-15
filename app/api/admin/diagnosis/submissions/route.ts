// app/api/admin/diagnosis/submissions/route.ts
// 診断フォームのコンバージョンユーザー一覧を返すAPI（管理者認証必要）
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAccessibleSchool } from "@/lib/authz";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const access = await resolveAccessibleSchool(searchParams.get("schoolId"));
    if (!access.ok) return access.response;

    const schoolId = access.schoolId;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));
    const days = Math.min(365, Math.max(1, Number(searchParams.get("days") || 30)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where = {
      schoolId,
      createdAt: { gte: since },
    };

    const [total, submissions] = await Promise.all([
      prisma.diagnosisFormSubmission.count({ where }),
      prisma.diagnosisFormSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          schoolId: true,
          formId: true,
          fields: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      submissions,
    });
  } catch (e: any) {
    console.error("❌ /api/admin/diagnosis/submissions GET error:", e);
    return NextResponse.json(
      { message: e?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
