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

/**
 * FAQ items 部分のみのバリデーション
 */
function validateItems(items: unknown): ValidateResult {
  if (!Array.isArray(items))
    return { ok: false, msg: "FAQは配列である必要があります" };

  for (const item of items as any[]) {
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
      for (const opt of options as any[]) {
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

/**
 * リクエスト body から items / palette / cta 系を抽出
 * - 旧形式: [ ... ] の場合 → items にそのまま入り、meta は undefined
 * - 新形式: { items, palette, ctaLabel, ctaUrl, launcherText } の場合 → 各プロパティに展開
 */
function extractPayload(raw: unknown): {
  items: unknown;
  palette?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  launcherText?: string | null;
} {
  if (Array.isArray(raw)) {
    return { items: raw };
  }
  if (raw && typeof raw === "object") {
    const r = raw as any;
    return {
      items: Array.isArray(r.items) ? r.items : [],
      palette:
        typeof r.palette === "string" && r.palette.trim() ? r.palette : null,
      ctaLabel:
        typeof r.ctaLabel === "string" && r.ctaLabel.trim() ? r.ctaLabel : null,
      ctaUrl: typeof r.ctaUrl === "string" && r.ctaUrl.trim() ? r.ctaUrl : null,
      launcherText:
        typeof r.launcherText === "string" && r.launcherText.trim()
          ? r.launcherText
          : null,
    };
  }
  return { items: [] };
}

function withNoCache<T>(data: T, init: ResponseInit = {}) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");

  // ▼ ここから CORS 設定
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  // ▲ ここまで CORS 設定

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
      select: {
        items: true,
        palette: true,
        ctaLabel: true,
        ctaUrl: true,
        launcherText: true, // ★ 追加
        updatedAt: true,
        updatedBy: true,
      },
    });

    // items は常に配列に正規化して返す（ChatbotEmbedClient 互換）
    const items = normalizeItems(rec?.items ?? []);

    return withNoCache(
      {
        items,
        palette: rec?.palette ?? null,
        ctaLabel: rec?.ctaLabel ?? null,
        ctaUrl: rec?.ctaUrl ?? null,
        launcherText: rec?.launcherText ?? null, // ★ 追加
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

    // 旧形式・新形式どちらでも対応
    const {
      items: rawItems,
      palette,
      ctaLabel,
      ctaUrl,
      launcherText,
    } = extractPayload(raw);

    // まず items 部分だけバリデーション
    const v = validateItems(rawItems);
    if (!v.ok) {
      return withNoCache(
        { error: v.msg ?? "不正なリクエストです" },
        { status: 400 }
      );
    }

    // 形式を揃える（保存前に normalize）
    const items = normalizeItems(rawItems);

    // 既存有無チェック（結果応答に使う）
    const exists = await prisma.faq.findUnique({
      where: { schoolId: school },
      select: { id: true },
    });

    const saved = await prisma.faq.upsert({
      where: { schoolId: school },
      update: {
        items,
        palette: palette ?? null,
        ctaLabel: ctaLabel ?? null,
        ctaUrl: ctaUrl ?? null,
        launcherText: launcherText ?? null, // ★ 追加
        updatedBy: "api",
      },
      create: {
        schoolId: school,
        items,
        palette: palette ?? null,
        ctaLabel: ctaLabel ?? null,
        ctaUrl: ctaUrl ?? null,
        launcherText: launcherText ?? null, // ★ 追加
        updatedBy: "api",
      },
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

// CORSプリフライト用
export async function OPTIONS(_req: NextRequest) {
  // ボディは空で OK。ヘッダーは withNoCache が付ける
  return withNoCache({}, { status: 204 });
}
