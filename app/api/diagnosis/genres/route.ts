// app/api/diagnosis/genres/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs"; // Bytes扱い＆大きめpayload想定で明示

// Prismaのエラーコードをできるだけ人間向けに返す
function toMessage(e: any) {
  const code = e?.code;
  if (code === "P2002") return "同じ id または slug が既に存在します（重複）";
  if (code === "P2022")
    return "DBに存在しないカラムを参照しています（migrate/DDL漏れの可能性）";
  return e?.message ?? "サーバーエラーが発生しました";
}

function toBool(v: any, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  return fallback;
}

function toNum(v: any, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * base64（dataURL可） -> Buffer
 * - "data:image/png;base64,AAAA" もOK
 * - "AAAA" だけでもOK（mimeは別途必須）
 */
function base64ToBuffer(input: string): Buffer {
  const s = String(input ?? "").trim();
  if (!s) return Buffer.alloc(0);

  const m = s.match(/^data:(.+?);base64,(.*)$/i);
  const b64 = m ? m[2] : s;
  return Buffer.from(b64, "base64");
}

function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

// GET /api/diagnosis/genres?schoolId=xxx&includeInactive=true&withImage=true
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") ?? "";
    if (!schoolId) return NextResponse.json([], { status: 200 });

    const includeInactive = toBool(searchParams.get("includeInactive"), false);
    const withImage = toBool(searchParams.get("withImage"), false);

    const where: any = { schoolId };
    if (!includeInactive) where.isActive = true;

    // 画像バイナリは返さない（重いので）。必要なら別APIを作る。
    const select: any = {
      id: true,
      schoolId: true,
      label: true,
      slug: true,
      answerTag: true,
      sortOrder: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    };

    if (withImage) {
      select.photoMime = true;
      // hasImage だけ返したいので、photoData自体はselectしない
      // Prismaでlengthを取るのは難しいので、null判定用に最小限で対応
      // → photoData は select しない代わりに、後で別クエリを避けるため photoData を select して null/非nullだけ見ることも可能
      // ただしBytesを返すとpayloadが増えるので、ここでは hasImage を "photoMimeがあるか" で代替します
    }

    const rows = await prisma.diagnosisGenre.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      select,
    });

    // withImage時は hasImage を付与（mimeがある = 画像が入ってる想定）
    if (withImage) {
      const enriched = (rows as any[]).map((r) => ({
        ...r,
        hasImage: Boolean(r.photoMime),
      }));
      return NextResponse.json(enriched);
    }

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("[GET /api/diagnosis/genres] error", e);
    return NextResponse.json({ message: toMessage(e) }, { status: 500 });
  }
}

// POST /api/diagnosis/genres
// body: { id, schoolId, label, slug, answerTag?, sortOrder?, isActive?, photoBase64?, photoMime? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const id = String(body?.id ?? "").trim();
    const schoolId = String(body?.schoolId ?? "").trim();
    const label = String(body?.label ?? "").trim();
    const slug = String(body?.slug ?? "").trim();
    const sortOrder = toNum(body?.sortOrder, 1);
    const isActive = Boolean(body?.isActive ?? true);

    const answerTagRaw = body?.answerTag;
    const answerTag =
      typeof answerTagRaw === "string" && answerTagRaw.trim()
        ? answerTagRaw.trim()
        : null;

    if (!id || !schoolId || !label || !slug) {
      return json("id / schoolId / label / slug は必須です", 400);
    }

    const data: any = { id, schoolId, label, slug, sortOrder, isActive };

    if (body?.answerTag !== undefined) data.answerTag = answerTag;

    // ✅ 画像（base64 + mime）
    if (body?.photoBase64 !== undefined || body?.photoMime !== undefined) {
      const mime = String(body?.photoMime ?? "").trim();
      const b64 = String(body?.photoBase64 ?? "").trim();

      if (!b64) {
        // 明示的に空なら「画像なし」で作成
        data.photoData = null;
        data.photoMime = null;
      } else {
        if (!mime) return json("photoMime が必要です（例: image/png）", 400);

        const buf = base64ToBuffer(b64);
        if (!buf.length) return json("photoBase64 が不正です", 400);

        // サイズ制限（必要なら調整）
        const MAX = 3 * 1024 * 1024; // 3MB
        if (buf.length > MAX)
          return json("画像サイズが大きすぎます（最大3MB）", 400);

        data.photoData = buf;
        data.photoMime = mime;
      }
    }

    const row = await prisma.diagnosisGenre.create({ data });

    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/diagnosis/genres] error", e);
    const status = e?.code === "P2002" ? 409 : 500;
    return NextResponse.json({ message: toMessage(e) }, { status });
  }
}

// PUT /api/diagnosis/genres
// body: { id, schoolId, label?, slug?, answerTag?, sortOrder?, isActive?, photoBase64?, photoMime? }
// photoBase64: "" で削除（NULL化）
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const id = String(body?.id ?? "").trim();
    const schoolId = String(body?.schoolId ?? "").trim();
    if (!id || !schoolId) return json("id / schoolId は必須です", 400);

    const patch: any = {};
    if (body?.label !== undefined) patch.label = String(body.label).trim();
    if (body?.slug !== undefined) patch.slug = String(body.slug).trim();
    if (body?.sortOrder !== undefined)
      patch.sortOrder = toNum(body.sortOrder, 0);
    if (body?.isActive !== undefined) patch.isActive = Boolean(body.isActive);

    if (body?.answerTag !== undefined) {
      const v = String(body.answerTag ?? "").trim();
      patch.answerTag = v ? v : null;
    }

    // ✅ 画像更新
    if (body?.photoBase64 !== undefined || body?.photoMime !== undefined) {
      const mime = String(body?.photoMime ?? "").trim();
      const b64 = String(body?.photoBase64 ?? "").trim();

      if (!b64) {
        // 空（または未指定文字列）なら削除扱い
        patch.photoData = null;
        patch.photoMime = null;
      } else {
        if (!mime) return json("photoMime が必要です（例: image/png）", 400);

        const buf = base64ToBuffer(b64);
        if (!buf.length) return json("photoBase64 が不正です", 400);

        const MAX = 3 * 1024 * 1024; // 3MB
        if (buf.length > MAX)
          return json("画像サイズが大きすぎます（最大3MB）", 400);

        patch.photoData = buf;
        patch.photoMime = mime;
      }
    }

    // schoolId一致チェック（他校のIDを更新できないように）
    const existing = await prisma.diagnosisGenre.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) return json("対象が見つかりません", 404);

    const row = await prisma.diagnosisGenre.update({
      where: { id },
      data: patch,
    });

    return NextResponse.json(row);
  } catch (e: any) {
    console.error("[PUT /api/diagnosis/genres] error", e);
    const status = e?.code === "P2002" ? 409 : 500;
    return NextResponse.json({ message: toMessage(e) }, { status });
  }
}

// DELETE /api/diagnosis/genres?id=xxx&schoolId=yyy&hard=true
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") ?? "";
    const schoolId = searchParams.get("schoolId") ?? "";
    const hard = toBool(searchParams.get("hard"), false);

    if (!id || !schoolId) return json("id / schoolId は必須です", 400);

    // schoolId一致チェック
    const existing = await prisma.diagnosisGenre.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) return json("対象が見つかりません", 404);

    if (hard) {
      // 物理削除（関連があると外部キーで失敗する可能性あり）
      await prisma.diagnosisGenre.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    const row = await prisma.diagnosisGenre.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(row);
  } catch (e: any) {
    console.error("[DELETE /api/diagnosis/genres] error", e);
    return NextResponse.json({ message: toMessage(e) }, { status: 500 });
  }
}
