import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/authz";

const MAX_CONTENT_LENGTH = 30_000;
const PRIVATE_HOST = /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/i;

function cleanText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ").trim().slice(0, MAX_CONTENT_LENGTH);
}

async function safeUrl(value: unknown) {
  const url = new URL(typeof value === "string" ? value.trim() : "");
  if (!["http:", "https:"].includes(url.protocol) || PRIVATE_HOST.test(url.hostname)) throw new Error("公開されている http(s) のサイトURLを入力してください。");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => PRIVATE_HOST.test(address) || address === "::1" || address.startsWith("fc") || address.startsWith("fd"))) throw new Error("このURLは読み込めません。");
  return url;
}

async function authorized(req: NextRequest) {
  const schoolId = new URL(req.url).searchParams.get("schoolId")?.trim() ?? "";
  if (!schoolId) return { error: NextResponse.json({ error: "schoolId が必要です" }, { status: 400 }) };
  const auth = await requireSchoolAccess(schoolId);
  if (!auth.ok) return { error: auth.response };
  return { schoolId };
}

export async function GET(req: NextRequest) {
  const access = await authorized(req); if ("error" in access) return access.error;
  const knowledge = await prisma.faq.findUnique({ where: { schoolId: access.schoolId }, select: { knowledgeSourceUrl: true, knowledgeContent: true, knowledgeUpdatedAt: true } });
  return NextResponse.json(knowledge ?? { knowledgeSourceUrl: null, knowledgeContent: null, knowledgeUpdatedAt: null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const access = await authorized(req); if ("error" in access) return access.error;
  try {
    const body = await req.json();
    const url = await safeUrl(body.url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, { signal: controller.signal, redirect: "error", headers: { "User-Agent": "RizboKnowledgeImporter/1.0" } });
    clearTimeout(timeout);
    if (!res.ok) throw new Error("サイトの読み込みに失敗しました。");
    const html = (await res.text()).slice(0, 1_000_000);
    const content = cleanText(html);
    if (content.length < 40) throw new Error("会話に使える本文を取得できませんでした。");
    const saved = await prisma.faq.upsert({
      where: { schoolId: access.schoolId },
      update: { knowledgeSourceUrl: url.toString(), knowledgeContent: content, knowledgeUpdatedAt: new Date() },
      create: { schoolId: access.schoolId, items: [], knowledgeSourceUrl: url.toString(), knowledgeContent: content, knowledgeUpdatedAt: new Date() },
      select: { knowledgeSourceUrl: true, knowledgeContent: true, knowledgeUpdatedAt: true },
    });
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "サイト情報の読み込みに失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
