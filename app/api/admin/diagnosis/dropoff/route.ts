// app/api/admin/diagnosis/dropoff/route.ts
// 診断ステップ別の通過数・離脱率を集計して返すAPI（管理者認証必要）
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// 診断ステップの定義
// ※ 「回答」したら通過とみなす（表示→回答をまとめて1行）
const STEP_ORDER = [
  { key: "Q1_ANSWER",   label: "Q1（年齢・ライフスタイル）" },
  { key: "Q2_ANSWER",   label: "Q2（ダンス経験・レベル）" },
  { key: "Q3_ANSWER",   label: "Q3（目的・お悩み）" },
  { key: "Q4_ANSWER",   label: "Q4（ジャンル・好み）" },
  { key: "Q5_ANSWER",   label: "Q5（不安・懸念）" },
  { key: "RESULT_VIEW", label: "結果画面 表示" },
  { key: "FORM_OPEN",   label: "申込フォーム 開く" },
  { key: "FORM_SUBMIT", label: "申込フォーム 送信（コンバージョン）" },
];

// 母数の基準：Q1を表示したセッション数（= 診断を開いた人）
const START_KEY = "Q1_VIEW";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") ?? "";
    const days = Math.max(1, Number(searchParams.get("days") || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where = {
      ...(schoolId ? { schoolId } : {}),
      createdAt: { gte: since },
    };

    // 全ログを取得してJSでユニークセッション数を集計
    const allLogs = await prisma.diagnosisSessionLog.findMany({
      where,
      select: { stepKey: true, sessionId: true },
    });

    // stepKey ごとのユニークsessionId数をカウント
    const uniqueByStep = new Map<string, Set<string>>();
    for (const log of allLogs) {
      if (!uniqueByStep.has(log.stepKey)) {
        uniqueByStep.set(log.stepKey, new Set());
      }
      uniqueByStep.get(log.stepKey)!.add(log.sessionId);
    }

    // 母数 = Q1_VIEW のユニークセッション数（診断を開いた人）
    // Q1_VIEW がない場合は全セッション数をフォールバックとする
    const allSessions = new Set(allLogs.map((l) => l.sessionId));
    const totalSessions =
      uniqueByStep.get(START_KEY)?.size ?? allSessions.size;

    // STEP_ORDER に従って集計（前ステップ比で離脱率を計算）
    const steps = STEP_ORDER.map((step, i) => {
      const count = uniqueByStep.get(step.key)?.size ?? 0;

      // 前ステップの通過数（最初の行は母数=診断開始数を使う）
      const prevCount =
        i === 0
          ? totalSessions
          : uniqueByStep.get(STEP_ORDER[i - 1].key)?.size ?? 0;

      const retentionRate =
        prevCount > 0 ? Math.round((count / prevCount) * 100) : null;
      const dropoffRate =
        prevCount > 0
          ? Math.round(((prevCount - count) / prevCount) * 100)
          : null;

      return {
        stepKey: step.key,
        label: step.label,
        count,
        prevCount,
        retentionRate,
        dropoffRate,
      };
    });

    return NextResponse.json({
      totalSessions,
      days,
      // データのあるステップのみ（フロントのデフォルト表示）
      steps: steps.filter((s) => s.count > 0),
      // 全ステップ（「全表示」ボタン用）
      allSteps: steps,
    });
  } catch (e: any) {
    console.error("❌ /api/admin/diagnosis/dropoff GET error:", e);
    return NextResponse.json(
      { message: e?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
