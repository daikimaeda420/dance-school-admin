// lib/faq/repo.ts
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { FAQDocument, FAQItem } from "./types";

function normalizeQuestion(item: any): FAQItem {
  return {
    type: "question",
    question:
      typeof item?.question === "string"
        ? item.question
        : String(item?.question ?? ""),
    answer:
      typeof item?.answer === "string" ? item.answer : String(item?.answer ?? ""),
    ...(typeof item?.url === "string" && item.url.trim()
      ? { url: item.url.trim() }
      : {}),
  };
}

function normalizeItem(item: any): FAQItem {
  if (item?.type === "select") {
    const options = Array.isArray(item.options) ? item.options : [];
    return {
      type: "select",
      question:
        typeof item?.question === "string"
          ? item.question
          : String(item?.question ?? ""),
      options: options.map((opt: any) => ({
        label: typeof opt?.label === "string" ? opt.label : "",
        next: normalizeItem(opt?.next ?? {}),
      })),
    };
  }

  return normalizeQuestion(item);
}

async function fetchFromDb(school: string): Promise<FAQDocument | null> {
  const rec = await prisma.faq.findUnique({
    where: { schoolId: school },
    select: { items: true, updatedAt: true },
  });
  if (!rec) return null;

  const items = Array.isArray(rec.items) ? rec.items : [];
  const root = items[0] ? normalizeItem(items[0]) : null;
  if (!root) return null;

  return {
    school,
    version: Math.floor(rec.updatedAt.getTime() / 1000),
    updatedAt: rec.updatedAt.toISOString(),
    root,
  };
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
