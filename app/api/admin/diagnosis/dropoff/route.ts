// app/api/admin/diagnosis/dropoff/route.ts
// 診断ステップ別の通過数・離脱率を集計して返すAPI（管理者認証必要）
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// 診断ステップの定義（表示順）
const STEP_ORDER = [
  { key: "Q1_VIEW",      label: "Q1 表示（年齢・ライフスタイル）" },
  { key: "Q1_ANSWER",    label: "Q1 回答" },
  { key: "Q2_VIEW",      label: "Q2 表示（ダンス経験・レベル）" },
  { key: "Q2_ANSWER",    label: "Q2 回答" },
  { key: "Q3_VIEW",      label: "Q3 表示（目的・お悩み）" },
  { key: "Q3_ANSWER",    label: "Q3 回答" },
  { key: "Q4_VIEW",      label: "Q4 表示（ジャンル・好み）" },
  { key: "Q4_ANSWER",    label: "Q4 回答" },
  { key: "Q5_VIEW",      label: "Q5 表示（不安・懸念）" },
  { key: "Q5_ANSWER",    label: "Q5 回答" },
  { key: "RESULT_VIEW",  label: "結果画面 表示" },
  { key: "FORM_OPEN",    label: "申込フォーム 開く" },
  { key: "FORM_SUBMIT",  label: "申込フォーム 送信（コンバージョン）" },
];

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

    // 全stepsのユニークセッション数を一括取得
    const stepCounts = await prisma.diagnosisSessionLog.groupBy({
      by: ["stepKey"],
      where,
      _count: { sessionId: true },
    });

    // stepsのユニークセッション数（stepKeyごと）を集計
    // ※ groupBy では distinct できないのでRawを使うか、全件取得してJSで集計する
    // ここではJSで集計（データ量が多すぎる場合は要最適化）
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

    // 全セッション数（Q1_VIEWまたは最初のステップのユニーク数）
    const allSessions = new Set(allLogs.map((l) => l.sessionId));
    const totalSessions = allSessions.size;

    // STEP_ORDER に従って並べて、前ステップとの離脱率を計算
    const steps = STEP_ORDER.map((step, i) => {
      const count = uniqueByStep.get(step.key)?.size ?? 0;
      const prevKey = i > 0 ? STEP_ORDER[i - 1].key : null;
      const prevCount = prevKey ? (uniqueByStep.get(prevKey)?.size ?? 0) : totalSessions;
      const retentionRate =
        prevCount > 0 ? Math.round((count / prevCount) * 100) : null;
      const dropoffRate =
        prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : null;

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
      steps: steps.filter((s) => s.count > 0), // データのあるステップのみ返す
      allSteps: steps, // 全ステップも返す（フロントで切り替え可能に）
    });
  } catch (e: any) {
    console.error("❌ /api/admin/diagnosis/dropoff GET error:", e);
    return NextResponse.json(
      { message: e?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
