// app/api/admin/diagnosis/form-email/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

/**
 * 認証チェック（管理画面用）
 */
async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return session;
}

function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function normalizeCsvEmails(input: unknown): string {
  const s = String(input ?? "").trim();
  if (!s) return "";
  // 改行/セミコロンも許可 → カンマに統一
  const normalized = s
    .replace(/\r?\n/g, ",")
    .replace(/;/g, ",")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .join(",");
  return normalized;
}

/**
 * GET /api/admin/diagnosis/form-email?schoolId=xxx
 * - あれば取得
 * - なければテンプレで自動作成して返す
 */
export async function GET(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) return json("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId")?.trim();

  if (!schoolId) return json("schoolId が必要です", 400);

  // 既存を取得
  const existing = await prisma.diagnosisFormEmailSetting.findUnique({
    where: { schoolId },
  });

  if (existing) return NextResponse.json(existing);

  // なければテンプレ作成
  const created = await prisma.diagnosisFormEmailSetting.create({
    data: {
      schoolId,
      isActive: true,

      fromName: null,
      fromEmail: null,
      replyTo: null,

      // ★必須：まずはログインユーザー宛てを仮Toにする（後で管理画面で変更）
      adminTo: String(session.user.email),

      adminCc: null,
      adminBcc: null,

      adminSubjectTemplate: "【診断フォーム】新しいお問い合わせ",
      adminBodyTemplate:
        "新しいフォーム送信がありました。\n\n【入力内容】\n{{fieldsText}}\n\n送信日時: {{submittedAt}}\nschoolId: {{schoolId}}\n",

      userAutoReplyEnabled: true,
      userSubjectTemplate: "お問い合わせありがとうございます",
      userBodyTemplate:
        "{{fields.お名前}} 様\n\nこの度はお問い合わせありがとうございます。\n内容を確認のうえ、担当よりご連絡いたします。\n\n【送信内容】\n{{fieldsText}}\n\n--\n{{schoolId}}\n",
    },
  });

  return NextResponse.json(created);
}

/**
 * PUT /api/admin/diagnosis/form-email
 * 管理画面からメール設定を保存
 */
export async function PUT(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) return json("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  if (!body) return json("Invalid JSON body", 400);

  const {
    id,
    schoolId,

    isActive,

    fromName,
    fromEmail,
    replyTo,

    adminTo,
    adminCc,
    adminBcc,

    adminSubjectTemplate,
    adminBodyTemplate,

    userAutoReplyEnabled,
    userSubjectTemplate,
    userBodyTemplate,
  } = body;

  // id があればそれ優先、なければ schoolId で更新
  const where =
    id && String(id).trim()
      ? { id: String(id).trim() }
      : schoolId && String(schoolId).trim()
        ? { schoolId: String(schoolId).trim() }
        : null;

  if (!where) return json("id もしくは schoolId が必要です", 400);

  // adminTo は必須
  const adminToNorm = normalizeCsvEmails(adminTo);
  if (!adminToNorm) return json("adminTo（管理者To）が必須です", 400);

  // subject は空だと困るので最低限のフォールバック
  const adminSub =
    String(adminSubjectTemplate ?? "").trim() ||
    "【診断フォーム】新しいお問い合わせ";
  const userSub =
    String(userSubjectTemplate ?? "").trim() ||
    "お問い合わせありがとうございます";

  // update（無ければ create してから update でもいいが、ここでは upsert にする）
  // where が id の場合 upsert が使いづらいので分岐
  try {
    if ("id" in where) {
      const updated = await prisma.diagnosisFormEmailSetting.update({
        where,
        data: {
          isActive: typeof isActive === "boolean" ? isActive : undefined,

          fromName: fromName ?? null,
          fromEmail: fromEmail ?? null,
          replyTo: replyTo ?? null,

          adminTo: adminToNorm,
          adminCc: normalizeCsvEmails(adminCc) || null,
          adminBcc: normalizeCsvEmails(adminBcc) || null,

          adminSubjectTemplate: adminSub,
          adminBodyTemplate: adminBodyTemplate ?? null,

          userAutoReplyEnabled:
            typeof userAutoReplyEnabled === "boolean"
              ? userAutoReplyEnabled
              : undefined,
          userSubjectTemplate: userSub,
          userBodyTemplate: userBodyTemplate ?? null,
        },
      });
      return NextResponse.json(updated);
    } else {
      const sid = (where as any).schoolId as string;

      const upserted = await prisma.diagnosisFormEmailSetting.upsert({
        where: { schoolId: sid },
        update: {
          isActive: typeof isActive === "boolean" ? isActive : undefined,

          fromName: fromName ?? null,
          fromEmail: fromEmail ?? null,
          replyTo: replyTo ?? null,

          adminTo: adminToNorm,
          adminCc: normalizeCsvEmails(adminCc) || null,
          adminBcc: normalizeCsvEmails(adminBcc) || null,

          adminSubjectTemplate: adminSub,
          adminBodyTemplate: adminBodyTemplate ?? null,

          userAutoReplyEnabled:
            typeof userAutoReplyEnabled === "boolean"
              ? userAutoReplyEnabled
              : undefined,
          userSubjectTemplate: userSub,
          userBodyTemplate: userBodyTemplate ?? null,
        },
        create: {
          schoolId: sid,
          isActive: typeof isActive === "boolean" ? isActive : true,

          fromName: fromName ?? null,
          fromEmail: fromEmail ?? null,
          replyTo: replyTo ?? null,

          adminTo: adminToNorm,
          adminCc: normalizeCsvEmails(adminCc) || null,
          adminBcc: normalizeCsvEmails(adminBcc) || null,

          adminSubjectTemplate: adminSub,
          adminBodyTemplate: adminBodyTemplate ?? null,

          userAutoReplyEnabled:
            typeof userAutoReplyEnabled === "boolean"
              ? userAutoReplyEnabled
              : true,
          userSubjectTemplate: userSub,
          userBodyTemplate: userBodyTemplate ?? null,
        },
      });

      return NextResponse.json(upserted);
    }
  } catch (e: any) {
    console.error("form-email PUT error:", e);
    return json(e?.message ?? "保存に失敗しました", 500);
  }
}
