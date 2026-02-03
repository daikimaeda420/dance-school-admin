// app/admin-data/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

function withNoCache<T>(data: T, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/**
 * 管理画面用 FAQ 一覧 / 詳細取得
 *
 * - GET /admin-data                : 全スクール分の FAQ 一覧
 * - GET /admin-data?school=XXXX    : 特定スクールの FAQ 詳細
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const school = searchParams.get("school");

    // 特定スクール指定あり → 1件だけ返す
    if (school) {
      const rec = await prisma.faq.findUnique({
        where: { schoolId: school },
        select: {
          id: true,
          schoolId: true,
          items: true,
          updatedAt: true,
          updatedBy: true,
        },
      });

      if (!rec) {
        return withNoCache(
          {
            ok: true,
            data: null,
          },
          { status: 200 },
        );
      }

      return withNoCache(
        {
          ok: true,
          data: {
            id: rec.id,
            schoolId: rec.schoolId,
            items: normalizeItems(rec.items ?? []),
            updatedAt: rec.updatedAt,
            updatedBy: rec.updatedBy,
          },
        },
        { status: 200 },
      );
    }

    // school 指定なし → 全件一覧
    const recs = await prisma.faq.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        schoolId: true,
        items: true,
        updatedAt: true,
        updatedBy: true,
      },
    });

    const data = recs.map((rec) => ({
      id: rec.id,
      schoolId: rec.schoolId,
      items: normalizeItems(rec.items ?? []),
      updatedAt: rec.updatedAt,
      updatedBy: rec.updatedBy,
    }));

    return withNoCache(
      {
        ok: true,
        count: data.length,
        data,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("GET /admin-data error:", err);
    return withNoCache(
      { ok: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
