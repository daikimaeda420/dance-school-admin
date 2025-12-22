// app/diagnosis/result/_components/MatchReason.tsx
"use client";
import { ScoreBreakdownItem } from "@/lib/diagnosis/score";

export default function MatchReason({
  score,
  breakdown,
}: {
  score: number;
  breakdown: ScoreBreakdownItem[];
}) {
  const hasNotes = breakdown?.length > 0;

  return (
    <section className="rounded-2xl border p-5">
      <h2 className="text-base font-semibold">このおすすめの理由</h2>

      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
          相性スコア {score}
        </span>
        <span className="text-xs text-neutral-600">
          減点が少ないほど相性が良い判定です
        </span>
      </div>

      {!hasNotes ? (
        <p className="mt-3 text-sm text-neutral-800">
          ほぼ完全一致に近いマッチです。
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm text-neutral-800">
          {breakdown.map((b, i) => (
            <li key={i} className="rounded-xl bg-neutral-50 p-3">
              <div className="text-xs font-semibold text-neutral-600">
                {b.key.toUpperCase()}（{b.scoreDiff}）
              </div>
              <div className="mt-1">{b.note}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
