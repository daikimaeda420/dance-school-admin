// app/api/faq/route.ts
import { NextRequest, NextResponse } from "next/server";
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

/**
 * question アイテムの正規化
 */
function normalizeQuestion(item: any): FaqQuestion {
  const question =
    typeof item?.question === "string"
      ? item.question
      : String(item?.question ?? "");
  const answer =
    typeof item?.answer === "string" ? item.answer : String(item?.answer ?? "");

  const url =
    typeof item?.url === "string" && item.url.trim().length > 0
      ? item.url
      : undefined;

  return {
    type: "question",
    question,
    answer,
    url,
  };
}

/**
 * select アイテムの正規化
 */
function normalizeSelect(item: any): FaqSelect {
  const question =
    typeof item?.question === "string"
      ? item.question
      : String(item?.question ?? "");

  const rawOptions = Array.isArray(item?.options) ? item.options : [];

  const options = rawOptions.map((opt: any) => {
    const label = typeof opt?.label === "string" ? opt.label : "";
    // select 内の next は question 固定
    const next = normalizeQuestion(opt?.next ?? {});
    return { label, next };
  });

  return {
    type: "select",
    question,
    options,
  };
}

/**
 * 全アイテム共通の正規化
 */
function normalizeItems(raw: unknown): FaqItem[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((item: any) => {
    if (item?.type === "select") {
      return normalizeSelect(item);
    }
    // type が不正 or question の場合は question として扱う
    return normalizeQuestion(item);
  });
}

/**
 * バリデーション結果の型
 */
type ValidateResult = {
  ok: boolean;
  msg?: string;
};

function validateItems(body: unknown): ValidateResult {
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

export async function GET(req: NextRequest) {
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

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const school = searchParams.get("school");
    if (!school)
      return withNoCache(
        { error: 'query param "school" is required' },
        { status: 400 }
      );

    // 本文をパース
    const raw = await req.json();

    // まずバリデーション（副作用なし）
    const v = validateItems(raw);
    if (!v.ok) {
      return withNoCache(
        { error: v.msg ?? "不正なリクエストです" },
        { status: 400 }
      );
    }

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
