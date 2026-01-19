// app/api/admin/diagnosis/form/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

/**
 * 認証チェック（管理画面用）
 */
async function ensureLoggedIn() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    return session;
  } catch (e) {
    console.error("❌ getServerSession error:", e);
    return null;
  }
}

/**
 * GET /api/admin/diagnosis/form?schoolId=xxx
 * - フォームがあれば取得
 * - なければテンプレ付きで自動生成
 */
export async function GET(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      return NextResponse.json(
        { message: "schoolId が必要です" },
        { status: 400 },
      );
    }

    // 既存フォームを取得
    const existing = await prisma.diagnosisForm.findUnique({
      where: { schoolId },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    // なければテンプレ付きで作成
    const created = await prisma.diagnosisForm.create({
      data: {
        schoolId,
        title: "体験レッスンのお申し込み",
        description: "30秒で簡単にお申し込みいただけます。",
        fields: {
          create: [
            {
              label: "お名前",
              type: "TEXT",
              required: true,
              sortOrder: 0,
            },
            {
              label: "メールアドレス",
              type: "EMAIL",
              required: true,
              sortOrder: 1,
            },
            {
              label: "電話番号",
              type: "TEL",
              required: false,
              sortOrder: 2,
            },
            {
              label: "備考",
              type: "TEXTAREA",
              required: false,
              sortOrder: 3,
            },
          ],
        },
      },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json(created);
  } catch (e: any) {
    console.error("❌ diagnosis/form GET error:", e);
    return NextResponse.json(
      { message: e?.message ?? "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/diagnosis/form
 * 管理画面からフォーム設定を保存
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      id,
      isActive,
      title,
      description,
      submitType,
      submitUrl,
      thanksType,
      thanksText,
      thanksUrl,
      fields,
    } = body ?? {};

    if (!id) {
      return NextResponse.json(
        { message: "form id が必要です" },
        { status: 400 },
      );
    }

    // フォーム本体更新
    await prisma.diagnosisForm.update({
      where: { id },
      data: {
        isActive,
        title,
        description,
        submitType,
        submitUrl,
        thanksType,
        thanksText,
        thanksUrl,
      },
    });

    // fields は一旦全削除 → 作り直し
    if (Array.isArray(fields)) {
      await prisma.diagnosisFormField.deleteMany({
        where: { formId: id },
      });

      if (fields.length > 0) {
        await prisma.diagnosisFormField.createMany({
          data: fields.map((f: any, index: number) => ({
            formId: id,
            label: f.label,
            type: f.type,
            required: !!f.required,
            placeholder: f.placeholder ?? null,
            optionsJson: f.optionsJson ?? null,
            sortOrder: index,
            isActive: f.isActive ?? true,
          })),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("❌ diagnosis/form PUT error:", e);
    return NextResponse.json(
      { message: e?.message ?? "Internal Server Error" },
      { status: 500 },
    );
  }
}
