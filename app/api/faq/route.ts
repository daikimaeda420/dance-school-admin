// app/api/faq/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // ← lib/prisma.ts のやつ

function normalizeItems(raw: any[]): any[] {
  return (Array.isArray(raw) ? raw : []).map((item: any) => {
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

function validateItems(body: any[]): { ok: true } | { ok: false; msg: string } {
  if (!Array.isArray(body))
    return { ok: false, msg: "FAQは配列である必要があります" };
  for (const item of body) {
    if (!item?.type || !item?.question)
      return { ok: false, msg: "type と question は必須です" };
    if (item.type === "question" && typeof item.answer !== "string") {
      return { ok: false, msg: "answer が不正です" };
    }
    if (item.type === "select") {
      if (!Array.isArray(item.options)) item.options = [];
      else {
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

    return NextResponse.json(normalizeItems(rec?.items ?? []), { status: 200 });
  } catch (err) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const school = searchParams.get("school");
    if (!school)
      return NextResponse.json(
        { error: "school が指定されていません" },
        { status: 400 }
      );

    const body = await req.json();
    console.log("POST /api/faq body =", body); // ← デバッグ表示

    const v = validateItems(body);
    if (!v.ok) return NextResponse.json({ error: v.msg }, { status: 400 });

    const result = await prisma.faq.upsert({
      where: { schoolId: school },
      update: { items: body, updatedBy: "api" },
      create: { schoolId: school, items: body, updatedBy: "api" },
      select: { id: true, schoolId: true },
    });

    console.log("upsert result =", result); // ← ここも見えると安心
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("POST /api/faq error:", err);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
