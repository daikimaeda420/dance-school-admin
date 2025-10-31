// app/api/faq/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ← lib/prisma.ts は named export を推奨

type FaqQuestion = {
  type: "question";
  question: string;
  answer: string;
  url?: string;
};

type FaqSelect = {
  type: "select";
  question: string;
  options: { label: string; next: FaqQuestion }[];
};

type FaqItem = FaqQuestion | FaqSelect;

function normalizeItems(raw: unknown): FaqItem[] {
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
          } as FaqQuestion,
        })),
      } as FaqSelect;
    }
    // question の場合
    return {
      type: "question",
      question: String(item?.question ?? ""),
      answer: String(item?.answer ?? ""),
      url: typeof item?.url === "string" ? item.url : undefined,
    } as FaqQuestion;
  });
}

function validateItems(
  body: unknown
): { ok: true } | { ok: false; msg: string } {
  if (!Array.isArray(body))
    return { ok: false, msg: "FAQは配列である必要があります" };

  for (const item of body) {
    const type = (item as any)?.type;
    const question = (item as any)?.question;

    if (!type || !question)
      return { ok: false, msg: "type と question は必須です" };

    if (type === "question") {
      if (typeof (item as any)?.answer !== "string") {
        return { ok: false, msg: "answer が不正です（文字列）" };
      }
    } else if (type === "select") {
      const options = (item as any)?.options;
      if (!Array.isArray(options))
        return {
          ok: false,
          msg: "select の options は配列である必要があります",
        };
      for (const opt of options) {
        if (typeof opt?.label !== "string")
          return {
            ok: false,
            msg: "select の label は文字列である必要があります",
          };
        const next = opt?.next;
        if (
          !next ||
          next?.type !== "question" ||
          typeof next?.question !== "string" ||
          typeof next?.answer !== "string"
        ) {
          return {
            ok: false,
            msg: "select の next は {type:'question', question:string, answer:string} 必須です",
          };
        }
      }
    } else {
      return { ok: false, msg: `未知の type です: ${String(type)}` };
    }
  }

  return { ok: true };
}

function withNoCache<T>(data: T, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const school = searchParams.get("school");
    if (!school)
      return withNoCache(
        { error: 'query param "school" is required' },
        { status: 400 }
      );

    const rec = await prisma.faq.findUnique({
      where: { schoolId: school },
      select: { items: true, updatedAt: true, updatedBy: true },
    });

    return withNoCache(
      {
        items: normalizeItems(rec?.items ?? []),
        updatedAt: rec?.updatedAt ?? null,
        updatedBy: rec?.updatedBy ?? null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/faq error:", err);
    return withNoCache({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const school = searchParams.get("school");
    if (!school)
      return withNoCache(
        { error: 'query param "school" is required' },
        { status: 400 }
      );

    // 本文をパース（App Routerでは必須）
    const raw = await req.json();

    // まずバリデーション（副作用なし）
    const v = validateItems(raw);
    if (!v.ok) return withNoCache({ error: v.msg }, { status: 400 });

    // 形式を揃える（保存前に normalize）
    const items = normalizeItems(raw);

    // 既存有無チェック（結果応答に使う）
    const exists = await prisma.faq.findUnique({
      where: { schoolId: school },
      select: { id: true },
    });

    const saved = await prisma.faq.upsert({
      where: { schoolId: school },
      update: { items, updatedBy: "api" },
      create: { schoolId: school, items, updatedBy: "api" },
      select: { id: true, schoolId: true, updatedAt: true },
    });

    return withNoCache(
      {
        ok: true,
        id: saved.id,
        schoolId: saved.schoolId,
        action: exists ? "updated" : "created",
        updatedAt: saved.updatedAt,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/faq error:", err);
    return withNoCache({ error: "保存に失敗しました" }, { status: 500 });
  }
}

// 必要なら OPTIONS を追加（CORS用）
// export async function OPTIONS() {
//   return withNoCache({}, { status: 204 });
// }
