// lib/faq/repo.ts
import crypto from "crypto";
import { FAQDocument } from "./types";

// 今後 Prisma / Supabase など DB から取得する処理をここに実装する
async function fetchFromDb(_school: string): Promise<FAQDocument | null> {
  // TODO: 後で実装（いまは一旦 null を返すだけ）
  return null;
}

export async function getFaqDocument(school: string) {
  // まず DB から取得（現状は null）
  const doc = await fetchFromDb(school);
  if (!doc) return null;

  const etag = crypto
    .createHash("sha1")
    .update(`${doc.school}:${doc.version}:${doc.updatedAt}`)
    .digest("hex");

  return { doc, etag };
}
