import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

function response(data: unknown, init: ResponseInit = {}) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

const clean = (value: unknown, max = 1000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function safeHeader(value: string, label: string) {
  if (/\r|\n/.test(value)) throw new Error(`${label} に不正な改行が含まれています`);
  return value.trim();
}

async function sendReservationNotification(reservation: {
  schoolId: string;
  name: string;
  email: string | null;
  phone: string | null;
  preferredDate: string | null;
  note: string | null;
  createdAt: Date;
}) {
  // 診断フォームと同じ「スクールへの通知先」設定を利用するため、
  // 追加のメールアドレス入力なしでチャット予約も同じ担当者に届く。
  const setting = await prisma.diagnosisFormEmailSetting.findUnique({
    where: { schoolId: reservation.schoolId },
    select: {
      isActive: true,
      fromName: true,
      fromEmail: true,
      replyTo: true,
      adminTo: true,
      adminCc: true,
      adminBcc: true,
    },
  });

  if (!setting?.isActive || !setting.fromEmail || !setting.adminTo) return "skipped";

  const host = env("SMTP_HOST");
  const port = Number(env("SMTP_PORT") || "587");
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");
  if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("チャット予約のメール通知に必要なSMTP設定が不足しています");
  }

  const values = [
    ["お名前", reservation.name],
    ["メールアドレス", reservation.email || "-"],
    ["電話番号", reservation.phone || "-"],
    ["希望日時", reservation.preferredDate || "-"],
    ["備考", reservation.note || "-"],
    ["受付日時", reservation.createdAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })],
  ];
  const text = [
    "チャットから新しい体験予約希望が届きました。",
    "",
    ...values.map(([label, value]) => `【${label}】\n${value}`),
    "",
    "管理画面: https://rizbo.dansul.jp/admin/chat-reservations",
  ].join("\n");
  const transporter = nodemailer.createTransport({
    host,
    port,
    name: "rizbo",
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: setting.fromName
      ? { name: safeHeader(setting.fromName, "fromName"), address: safeHeader(setting.fromEmail, "fromEmail") }
      : safeHeader(setting.fromEmail, "fromEmail"),
    to: safeHeader(setting.adminTo, "adminTo"),
    cc: setting.adminCc ? safeHeader(setting.adminCc, "adminCc") : undefined,
    bcc: setting.adminBcc ? safeHeader(setting.adminBcc, "adminBcc") : undefined,
    replyTo: setting.replyTo ? safeHeader(setting.replyTo, "replyTo") : undefined,
    subject: "【RIZBO】チャットから新しい体験予約希望が届きました",
    text,
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  return "sent";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const schoolId = clean(body?.schoolId, 100);
    const name = clean(body?.name, 100);
    const email = clean(body?.email, 254);
    const phone = clean(body?.phone, 40);

    if (!schoolId || !name || (!email && !phone)) {
      return response(
        { error: "お名前と、メールアドレスまたは電話番号を入力してください。" },
        { status: 400 },
      );
    }

    const faq = await prisma.faq.findUnique({
      where: { schoolId },
      select: { reservationMode: true },
    });
    if (faq?.reservationMode !== "RIZBO") {
      return response({ error: "このスクールではチャット予約を受け付けていません。" }, { status: 403 });
    }

    const reservation = await prisma.chatReservation.create({
      data: {
        schoolId,
        name,
        email: email || null,
        phone: phone || null,
        preferredDate: clean(body?.preferredDate, 100) || null,
        note: clean(body?.note, 2000) || null,
        sessionId: clean(body?.sessionId, 100) || null,
      },
    });

    let notification = "skipped";
    try {
      notification = await sendReservationNotification(reservation);
    } catch (mailError) {
      // 予約そのものは保存済みなので、メール障害で利用者の受付を失敗させない。
      notification = "failed";
      console.error("chat reservation notification error:", mailError);
    }

    return response({ ok: true, notification }, { status: 201 });
  } catch (error) {
    console.error("POST /api/chat/reservations error:", error);
    return response({ error: "予約受付に失敗しました。時間をおいて再度お試しください。" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return response({}, { status: 204 });
}
