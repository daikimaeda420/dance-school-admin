export const runtime = "nodejs";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

type ContactBody = {
  schoolName?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  website?: string;
};

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanHeader(value: string, label: string, maxLength = 200) {
  const next = cleanText(value, maxLength);
  if (/[\r\n]/.test(next)) {
    throw new Error(`${label} に不正な改行が含まれています`);
  }
  return next;
}

function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as ContactBody | null;
    if (!body || typeof body !== "object") {
      return json("入力内容を確認してください。", 400);
    }

    if (cleanText(body.website, 200)) {
      return NextResponse.json({ ok: true });
    }

    const schoolName = cleanText(body.schoolName, 120);
    const name = cleanText(body.name, 80);
    const email = cleanHeader(cleanText(body.email, 160), "email", 160);
    const phone = cleanText(body.phone, 40);
    const message = cleanText(body.message, 2000);

    if (!schoolName || !name || !email) {
      return json("スクール名・お名前・メールアドレスを入力してください。", 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json("メールアドレスの形式を確認してください。", 400);
    }

    const host = env("SMTP_HOST");
    const port = Number(env("SMTP_PORT") || "587");
    const user = env("SMTP_USER");
    const pass = env("SMTP_PASS");
    const to = cleanHeader(env("CONTACT_TO_EMAIL") || "support@rizbo.jp", "to");
    const fromEmail = cleanHeader(env("CONTACT_FROM_EMAIL") || user, "fromEmail");

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return json("メール設定のポート番号が不正です。", 500);
    }

    if (!host || !user || !pass || !fromEmail) {
      return json("メール送信設定が不足しています。", 500);
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      name: "rizbo",
      secure: port === 465,
      auth: { user, pass },
    });

    const submittedAt = new Date().toISOString();
    const subject = cleanHeader(`【rizbo】導入相談フォーム: ${schoolName}`, "subject");
    const text = [
      "LPの導入相談フォームから送信がありました。",
      "",
      `スクール名: ${schoolName}`,
      `お名前: ${name}`,
      `メールアドレス: ${email}`,
      `電話番号: ${phone || "-"}`,
      "",
      "相談内容:",
      message || "-",
      "",
      `送信日時: ${submittedAt}`,
    ].join("\n");

    await transporter.sendMail({
      from: { name: "rizbo LP", address: fromEmail },
      to,
      replyTo: email,
      subject,
      text,
      disableFileAccess: true,
      disableUrlAccess: true,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ /api/contact error:", error);
    return json("送信に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
