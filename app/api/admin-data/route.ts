// app/api/faq/route.ts
export const runtime = "nodejs"; // PrismaはNodeランタイム推奨
export const dynamic = "force-dynamic"; // キャッシュ回避

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // ← lib/prisma.ts（@prisma/client を包むやつ）

/** fs版と同等の最小正規化 */
function normalizeItems(raw: unknown): any[] {
  const arr = Array.isArray(raw) ? raw : [];

  return arr.map((item: any) => {
    if (item?.type === "select") {
      const options = Array.isArray(item.options) ? item.options : [];
      return {
        ...item,
        options: options.map((opt: any) => ({
          label: typeof opt?.label === "string" ? opt.label : "",
          next: {
            type: "question",
            question: opt?.next?.question ?? "",
            answer: opt?.next?.answer ?? "",
            url: opt?.next?.url ?? "",
          },
        })),
      };
    }
    return item;
  });
}

type ValidationResult = {
  ok: boolean;
  msg?: string;
};

/** fs版と同等の簡易バリデーション */
function validateItems(body: unknown): ValidationResult {
  if (!Array.isArray(body)) {
    return { ok: false, msg: "FAQは配列である必要があります" };
  }

  for (const item of body as any[]) {
    if (!item?.type || !item?.question) {
      return { ok: false, msg: "type と question は必須です" };
    }

    if (item.type === "question" && typeof item.answer !== "string") {
      return { ok: false, msg: "answer が不正です" };
    }

    if (item.type === "select") {
      if (!Array.isArray(item.options)) {
        item.options = [];
      } else {
        item.options = item.options.filter(
          (opt: any) =>
            typeof opt?.label === "string" &&
            opt?.next &&
            typeof opt.next.question === "string" &&
            typeof opt.next.answer === "string"
        );
      }
    }
  }

  return { ok: true };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const school = searchParams.get("school");
    if (!school) return NextResponse.json([], { status: 400 });

    const rec = await prisma.faq.findUnique({
      where: { schoolId: school },
      select: { items: true },
    });

    const items = normalizeItems(rec?.items);
    return NextResponse.json(items, { status: 200 });
  } catch {
    // fs版互換：エラーでも空配列を返す
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const school = searchParams.get("school");
    if (!school) {
      return NextResponse.json(
        { error: "school が指定されていません" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const v = validateItems(body);

    if (!v.ok) {
      return NextResponse.json(
        { error: v.msg ?? "FAQデータが不正です" },
        { status: 400 }
      );
    }

    await prisma.faq.upsert({
      where: { schoolId: school },
      update: { items: body, updatedBy: "api" },
      create: { schoolId: school, items: body, updatedBy: "api" },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("POST /api/faq error:", err);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
