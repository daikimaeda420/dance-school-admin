// app/diagnosis/result/page.tsx
"use client";

import { useEffect, useState } from "react";
import MatchReason from "./_components/MatchReason";

type VM = {
  headline: string;
  subline: string;
  campus?: { id: string; label: string; slug: string };
  genre?: { id: string; label: string; slug: string };
  messages?: {
    q2?: string;
    q3?: string;
    q5?: string;
    q6?: string;
    q6Support?: string;
  };
  result?: {
    id: string;
    title: string;
    body?: string | null;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
  };
};

export default function DiagnosisResultPage() {
  const [vm, setVm] = useState<VM | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const schoolId = localStorage.getItem("diag_schoolId") ?? "";
        const answersRaw = localStorage.getItem("diag_answers") ?? "{}";
        const answers = JSON.parse(answersRaw);

        if (!schoolId)
          throw new Error("schoolId がありません（diag_schoolId）");
        if (!answers || Object.keys(answers).length === 0)
          throw new Error("answers がありません（diag_answers）");

        const res = await fetch("/api/diagnosis/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schoolId, answers }),
        });

        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.message ?? "診断結果の取得に失敗しました");

        // ✅ viewModel 優先。無い場合は将来の互換で落ちないように
        setVm(data.viewModel ?? null);
      } catch (e: any) {
        setErr(e?.message ?? "不明なエラー");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6">読み込み中...</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!vm) return <div className="p-6">結果がありません</div>;

  const ctaUrl = vm.result?.ctaUrl ?? "#";
  const ctaLabel = vm.result?.ctaLabel ?? "体験レッスンを予約する";

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <section className="rounded-2xl border p-5">
        <h1 className="text-xl font-bold">{vm.headline}</h1>
        <p className="mt-2 text-sm text-neutral-600">{vm.subline}</p>

        <a
          className="mt-4 block rounded-xl bg-neutral-900 px-4 py-3 text-center text-sm font-semibold text-white"
          href={ctaUrl}
        >
          {ctaLabel}
        </a>
      </section>

      <section className="rounded-2xl border p-5 space-y-3">
        <div className="text-sm font-semibold">あなたへのアドバイス</div>
        {vm.messages?.q2 && <p className="text-sm">{vm.messages.q2}</p>}
        {vm.messages?.q3 && <p className="text-sm">{vm.messages.q3}</p>}
        {vm.messages?.q5 && (
          <p className="text-sm whitespace-pre-wrap">{vm.messages.q5}</p>
        )}
        {vm.messages?.q6 && (
          <p className="text-sm whitespace-pre-wrap">{vm.messages.q6}</p>
        )}
      </section>

      {/* スコアリングを使ってる場合だけ意味があるので、いったんダミーで表示（不要なら消してOK） */}
      <MatchReason score={100} breakdown={[]} />

      {vm.result?.title && (
        <section className="rounded-2xl border p-5">
          <h2 className="text-base font-semibold">{vm.result.title}</h2>
          {vm.result.body && (
            <div className="mt-3 text-sm whitespace-pre-wrap">
              {vm.result.body}
            </div>
          )}
          <a
            className="mt-4 block rounded-xl bg-neutral-900 px-4 py-3 text-center text-sm font-semibold text-white"
            href={ctaUrl}
          >
            {ctaLabel}
          </a>
        </section>
      )}
    </main>
  );
}
