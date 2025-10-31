import crypto from "crypto";
import { FAQDocument } from "./types";

// まずは JSON ファイル読取（将来 DB に差し替え可能）
async function fetchFromJson(school: string): Promise<FAQDocument | null> {
  try {
    // 例: /data/faq/{school}.json に保存している前提
    const mod = await import(`../../data/faq/${school}.json`, {
      assert: { type: "json" },
    } as any);
    return mod.default as FAQDocument;
  } catch {
    return null;
  }
}

// Prisma/Postgres が整備できたらここに接続処理を実装
async function fetchFromDb(_school: string): Promise<FAQDocument | null> {
  return null;
}

export async function getFaqDocument(school: string) {
  const fromDb = await fetchFromDb(school);
  const doc = fromDb ?? (await fetchFromJson(school));
  if (!doc) return null;

  const etag = crypto
    .createHash("sha1")
    .update(`${doc.school}:${doc.version}:${doc.updatedAt}`)
    .digest("hex");

  return { doc, etag };
}
