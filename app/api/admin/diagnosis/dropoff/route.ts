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
  { key: "FORM_OPEN",   label: "申込フォームまで到達" },
  { key: "FORM_SUBMIT", label: "申込フォーム 送信（コンバージョン）" },
];

// 母数の基準：Q1を表示したセッション数（= 診断を開いた人）
const START_KEY = "Q1_VIEW";

// アイコンクリック集計対象キー
const ICON_KEYS = [
  { key: "CHAT_ICON_CLICK",        label: "チャットアイコン クリック" },
  { key: "DIAGNOSIS_BANNER_CLICK", label: "診断バナー クリック" },
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
    const allSessions = new Set(allLogs.map((l) => l.sessionId));
    const totalSessions =
      uniqueByStep.get(START_KEY)?.size ?? allSessions.size;

    // ── メイン診断ファネル集計 ──
    const steps = STEP_ORDER.map((step, i) => {
      const count = uniqueByStep.get(step.key)?.size ?? 0;
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

    // ── アイコンクリック集計 ──
    // allowDuplicate=true のため totalClicks は延べ回数、uniqueSessions はユニーク人数
    const iconClickStats = ICON_KEYS.map(({ key, label }) => ({
      stepKey: key,
      label,
      totalClicks: allLogs.filter((l) => l.stepKey === key).length,
      uniqueSessions: uniqueByStep.get(key)?.size ?? 0,
    }));

    // ── フォームフィールド別集計 ──
    // FORM_FIELD_* : そのフィールドまで入力したユニーク人数
    // FORM_ABANDON_* : そのフィールドで離脱したユニーク人数（最後にタッチして閉じた）
    const formFieldKeys = Array.from(
      new Set(
        allLogs
          .filter((l) => l.stepKey.startsWith("FORM_FIELD_"))
          .map((l) => l.stepKey)
      )
    ).sort();

    const formOpenCount = uniqueByStep.get("FORM_OPEN")?.size ?? 0;

    const formFieldSteps = formFieldKeys.map((key) => {
      const label = key.replace("FORM_FIELD_", "");
      const reachedCount = uniqueByStep.get(key)?.size ?? 0;
      const abandonKey = `FORM_ABANDON_${label}`;
      const abandonCount = uniqueByStep.get(abandonKey)?.size ?? 0;
      const reachedRate =
        formOpenCount > 0
          ? Math.round((reachedCount / formOpenCount) * 100)
          : null;
      return {
        stepKey: key,
        label,
        reachedCount,
        abandonCount,
        reachedRate,
      };
    });

    return NextResponse.json({
      totalSessions,
      days,
      // データのあるステップのみ（フロントのデフォルト表示）
      steps: steps.filter((s) => s.count > 0),
      // 全ステップ（「全表示」ボタン用）
      allSteps: steps,
      // アイコン・バナークリック統計
      iconClickStats,
      // フォームフィールド別集計
      formOpenCount,
      formFieldSteps,
    });
  } catch (e: any) {
    console.error("❌ /api/admin/diagnosis/dropoff GET error:", e);
    return NextResponse.json(
      { message: e?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
