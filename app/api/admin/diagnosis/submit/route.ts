import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      message:
        "この旧APIは廃止されました。公開フォーム送信は /api/diagnosis/submit を使用してください。",
    },
    { status: 410 },
  );
}
