// app/api/diagnosis/submit/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import type { SentMessageInfo } from "nodemailer";

type SubmitBody = {
  schoolId: string;
  // fieldId -> value の形（DiagnosisForm側で作る）
  fields: Record<string, string>;
  hiddenValues?: Record<string, string>;
};

type MailMessageType = "ADMIN_NOTIFICATION" | "USER_AUTO_REPLY";
type MailDeliveryStatus = "SENT" | "ERROR" | "SKIPPED";

type MailDeliveryLogInput = {
  schoolId: string;
  submissionId?: string | null;
  messageType: MailMessageType;
  status: MailDeliveryStatus;
  fromEmail?: string | null;
  toEmail?: string | null;
  ccEmail?: string | null;
  bccEmail?: string | null;
  replyTo?: string | null;
  subject?: string | null;
  info?: SentMessageInfo | null;
  error?: unknown;
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

function cleanHeaderText(value: string, maxLength = 200) {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function assertHeaderValue(value: string | null | undefined, label: string) {
  const v = String(value ?? "").trim();
  if (/[\r\n]/.test(v)) {
    throw new Error(`${label} に不正な改行が含まれています`);
  }
  return v;
}

function nullableText(value: unknown, maxLength = 1000) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function normalizeAddressList(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getErrorMessage(error: unknown) {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return String(error);
}

async function saveMailDeliveryLog(input: MailDeliveryLogInput) {
  try {
    await prisma.diagnosisMailDeliveryLog.create({
      data: {
        schoolId: input.schoolId,
        submissionId: input.submissionId ?? null,
        messageType: input.messageType,
        status: input.status,
        fromEmail: nullableText(input.fromEmail, 320),
        toEmail: nullableText(input.toEmail, 1000),
        ccEmail: nullableText(input.ccEmail, 1000),
        bccEmail: nullableText(input.bccEmail, 1000),
        replyTo: nullableText(input.replyTo, 320),
        subject: nullableText(input.subject, 300),
        messageId: nullableText(input.info?.messageId, 500),
        accepted: normalizeAddressList(input.info?.accepted),
        rejected: normalizeAddressList(input.info?.rejected),
        response: nullableText(input.info?.response, 1000),
        error: nullableText(getErrorMessage(input.error), 1000),
      },
    });
  } catch (logErr) {
    console.error("DiagnosisMailDeliveryLog create error:", logErr);
  }
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

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT が不正です");
  }

  if (!host || !user || !pass || !fromEmail) {
    throw new Error(
      "メール送信の環境変数が不足しています（SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/FromEmail）",
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    name: "rizbo",
    secure: port === 465,
    auth: { user, pass },
  });

  const safeFromEmail = assertHeaderValue(fromEmail, "fromEmail");
  const safeTo = assertHeaderValue(to, "to");
  const safeCc = cc ? assertHeaderValue(cc, "cc") : "";
  const safeBcc = bcc ? assertHeaderValue(bcc, "bcc") : "";
  const safeReplyTo = replyTo ? assertHeaderValue(replyTo, "replyTo") : "";
  const safeSubject = cleanHeaderText(subject);
  const safeFromName = cleanHeaderText(fromName, 120);
  const from = safeFromName
    ? { name: safeFromName, address: safeFromEmail }
    : safeFromEmail;

  return transporter.sendMail({
    from,
    to: safeTo,
    cc: safeCc || undefined,
    bcc: safeBcc || undefined,
    replyTo: safeReplyTo || undefined,
    subject: safeSubject,
    text,
    disableFileAccess: true,
    disableUrlAccess: true,
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

    const vars: Record<string, string> = {
      fieldsText,
      hiddenText,
      submittedAt,
      schoolId,
      userEmail,
    };

    // {{fields.XXX}} や {{hidden.XXX}} をテンプレートで使えるように追加
    for (const [k, v] of Object.entries(fields)) {
      vars[`fields.${k}`] = String(v);
    }
    for (const [k, v] of Object.entries(hiddenValues)) {
      vars[`hidden.${k}`] = String(v);
    }

    // =========
    // DBに送信履歴（コンバージョン）を保存
    // =========
    let createdSubmission: { id: string } | null = null;

    try {
      createdSubmission = await prisma.diagnosisFormSubmission.create({
        select: { id: true },
        data: {
          schoolId,
          fields: { ...fields, ...hiddenValues },
        },
      });
    } catch (dbErr) {
      console.error("DiagnosisFormSubmission create error:", dbErr);
      // 送信自体は止めずに続行する
    }

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

    const adminMail = {
      fromName: emailSetting.fromName ?? "",
      fromEmail: emailSetting.fromEmail ?? "",
      replyTo: emailSetting.replyTo ?? undefined,
      to: emailSetting.adminTo ?? "",
      cc: emailSetting.adminCc ?? null,
      bcc: emailSetting.adminBcc ?? null,
      subject: adminSubject,
      text: adminBody,
    };

    try {
      const info = await sendMail(adminMail);
      await saveMailDeliveryLog({
        schoolId,
        submissionId: createdSubmission?.id ?? null,
        messageType: "ADMIN_NOTIFICATION",
        status: "SENT",
        fromEmail: adminMail.fromEmail,
        toEmail: adminMail.to,
        ccEmail: adminMail.cc,
        bccEmail: adminMail.bcc,
        replyTo: adminMail.replyTo,
        subject: adminMail.subject,
        info,
      });
    } catch (mailErr) {
      await saveMailDeliveryLog({
        schoolId,
        submissionId: createdSubmission?.id ?? null,
        messageType: "ADMIN_NOTIFICATION",
        status: "ERROR",
        fromEmail: adminMail.fromEmail,
        toEmail: adminMail.to,
        ccEmail: adminMail.cc,
        bccEmail: adminMail.bcc,
        replyTo: adminMail.replyTo,
        subject: adminMail.subject,
        error: mailErr,
      });
      throw mailErr;
    }

    // =========
    // ユーザー自動返信
    // =========
    if (emailSetting.userAutoReplyEnabled) {
      const userSubject = applyTemplate(
        emailSetting.userSubjectTemplate ??
          "【受付】お申し込みありがとうございます",
        vars,
      );

      if (!userEmail) {
        // 自動返信はユーザーのメールが取れないと送れないので、ここはスキップ
        console.warn("userEmail が取得できないため自動返信をスキップしました");
        await saveMailDeliveryLog({
          schoolId,
          submissionId: createdSubmission?.id ?? null,
          messageType: "USER_AUTO_REPLY",
          status: "SKIPPED",
          fromEmail: emailSetting.fromEmail ?? "",
          toEmail: "",
          replyTo: emailSetting.replyTo ?? undefined,
          subject: userSubject,
          error: "userEmail が取得できないため自動返信をスキップしました",
        });
      } else {
        const userBody = applyTemplate(
          emailSetting.userBodyTemplate ??
            `お申し込みありがとうございます。\n\n以下の内容で受け付けました。\n\n{{fieldsText}}\n\n送信日時: {{submittedAt}}`,
          vars,
        );

        const userMail = {
          fromName: emailSetting.fromName ?? "",
          fromEmail: emailSetting.fromEmail ?? "",
          replyTo: emailSetting.replyTo ?? undefined,
          to: userEmail,
          subject: userSubject,
          text: userBody,
        };

        try {
          const info = await sendMail(userMail);
          await saveMailDeliveryLog({
            schoolId,
            submissionId: createdSubmission?.id ?? null,
            messageType: "USER_AUTO_REPLY",
            status: "SENT",
            fromEmail: userMail.fromEmail,
            toEmail: userMail.to,
            replyTo: userMail.replyTo,
            subject: userMail.subject,
            info,
          });
        } catch (mailErr) {
          await saveMailDeliveryLog({
            schoolId,
            submissionId: createdSubmission?.id ?? null,
            messageType: "USER_AUTO_REPLY",
            status: "ERROR",
            fromEmail: userMail.fromEmail,
            toEmail: userMail.to,
            replyTo: userMail.replyTo,
            subject: userMail.subject,
            error: mailErr,
          });
          throw mailErr;
        }
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
