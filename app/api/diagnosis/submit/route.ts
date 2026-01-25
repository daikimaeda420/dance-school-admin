// app/api/diagnosis/submit/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

type SubmitBody = {
  schoolId: string;
  // fieldId -> value の形（DiagnosisForm側で作る）
  fields: Record<string, string>;
  hiddenValues?: Record<string, string>;
};

function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function buildFieldsText(fields: Record<string, string>) {
  const lines = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return lines;
}

function applyTemplate(template: string, vars: Record<string, string>) {
  let out = template ?? "";
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

async function sendMail({
  fromName,
  fromEmail,
  replyTo,
  to,
  cc,
  bcc,
  subject,
  text,
}: {
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  to: string;
  cc?: string | null;
  bcc?: string | null;
  subject: string;
  text: string;
}) {
  const host = env("SMTP_HOST");
  const port = Number(env("SMTP_PORT") || "587");
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");

  if (!host || !port || !user || !pass || !fromEmail) {
    throw new Error(
      "メール送信の環境変数が不足しています（SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/FromEmail）",
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

  await transporter.sendMail({
    from,
    to,
    cc: cc ?? undefined,
    bcc: bcc ?? undefined,
    replyTo: replyTo || undefined,
    subject,
    text,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SubmitBody;

    const schoolId = String(body?.schoolId ?? "").trim();
    const fields = (body?.fields ?? {}) as Record<string, string>;
    const hiddenValues = (body?.hiddenValues ?? {}) as Record<string, string>;

    if (!schoolId) return json("schoolId が必要です", 400);

    // ✅ メール設定を取得（管理画面で編集している前提）
    // ※モデル名はプロジェクト側に合わせてください。
    // ここでは `diagnosisFormEmailSetting` を想定しています。
    const emailSetting = await prisma.diagnosisFormEmailSetting.findUnique({
      where: { schoolId },
    });

    if (!emailSetting) {
      return json(
        "メール設定が見つかりません（管理画面で設定してください）",
        400,
      );
    }

    if (!emailSetting.isActive) {
      return json("メール機能が無効です（管理画面で有効化してください）", 400);
    }

    // ✅ フィールドからユーザーのメールアドレスを推定（最初に見つかった emailっぽい値）
    const userEmail =
      Object.values(fields).find((v) => /.+@.+\..+/.test(String(v))) ?? "";

    const submittedAt = new Date().toISOString();

    const fieldsText = buildFieldsText(fields);
    const hiddenText = buildFieldsText(hiddenValues);

    const vars = {
      fieldsText,
      hiddenText,
      submittedAt,
      schoolId,
      userEmail,
    };

    // =========
    // 管理者通知
    // =========
    const adminSubject = applyTemplate(
      emailSetting.adminSubjectTemplate ?? "【申込】新規フォーム送信",
      vars,
    );
    const adminBody = applyTemplate(
      emailSetting.adminBodyTemplate ??
        `新しいフォーム送信がありました。\n\n{{fieldsText}}\n\n---\nhidden:\n{{hiddenText}}\n\nsubmittedAt: {{submittedAt}}\nschoolId: {{schoolId}}`,
      vars,
    );

    await sendMail({
      fromName: emailSetting.fromName ?? "",
      fromEmail: emailSetting.fromEmail ?? "",
      replyTo: emailSetting.replyTo ?? undefined,
      to: emailSetting.adminTo ?? "",
      cc: emailSetting.adminCc ?? null,
      bcc: emailSetting.adminBcc ?? null,
      subject: adminSubject,
      text: adminBody,
    });

    // =========
    // ユーザー自動返信
    // =========
    if (emailSetting.userAutoReplyEnabled) {
      if (!userEmail) {
        // 自動返信はユーザーのメールが取れないと送れないので、ここはスキップ
        console.warn("userEmail が取得できないため自動返信をスキップしました");
      } else {
        const userSubject = applyTemplate(
          emailSetting.userSubjectTemplate ??
            "【受付】お申し込みありがとうございます",
          vars,
        );
        const userBody = applyTemplate(
          emailSetting.userBodyTemplate ??
            `お申し込みありがとうございます。\n\n以下の内容で受け付けました。\n\n{{fieldsText}}\n\n送信日時: {{submittedAt}}`,
          vars,
        );

        await sendMail({
          fromName: emailSetting.fromName ?? "",
          fromEmail: emailSetting.fromEmail ?? "",
          replyTo: emailSetting.replyTo ?? undefined,
          to: userEmail,
          subject: userSubject,
          text: userBody,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("❌ /api/diagnosis/submit error:", e);
    return NextResponse.json(
      { message: e?.message ?? "Internal Server Error" },
      { status: 500 },
    );
  }
}
