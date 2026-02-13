// app/diagnosis/result/page.tsx
"use client";

import { useEffect, useState } from "react";
import MatchReason from "./_components/MatchReason";

type SelectedCampus = {
  label: string;
  slug: string;
  address?: string | null;
  access?: string | null;
  googleMapUrl?: string | null;
};

type VM = {
  headline: string;
  subline: string;
  campus?: { id: string; label: string; slug: string };
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

  // ✅ 追加：結果の一番下に出す校舎詳細
  selectedCampus?: SelectedCampus | null;
};

function CampusDetailBox({ campus }: { campus?: SelectedCampus | null }) {
  if (!campus) return null;

  const hasAny =
    !!campus.address ||
    !!campus.access ||
    !!campus.googleMapUrl ||
    !!campus.label;

  if (!hasAny) return null;

  return (
    <section className="rounded-2xl border p-5 space-y-3">
      <div className="text-sm font-semibold">選択した校舎情報</div>

      <div className="text-sm">
        <span className="text-neutral-500">校舎：</span>
        <span className="font-medium">{campus.label}</span>
      </div>

      {campus.address ? (
        <div className="text-sm">
          <div className="text-xs text-neutral-500">住所</div>
          <div>{campus.address}</div>
        </div>
      ) : null}

      {campus.access ? (
        <div className="text-sm">
          <div className="text-xs text-neutral-500">アクセス</div>
          <div className="whitespace-pre-wrap">{campus.access}</div>
        </div>
      ) : null}

      {campus.googleMapUrl ? (
        <a
          className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-center text-sm font-semibold text-white"
          href={campus.googleMapUrl}
          target="_blank"
          rel="noreferrer"
        >
          Google Mapで見る
        </a>
      ) : null}
    </section>
  );
}

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

        // ✅ viewModel を基本にしつつ、APIが返す selectedCampus もVMに合体
        const baseVm = (data.viewModel ?? null) as VM | null;
        if (!baseVm) {
          setVm(null);
          return;
        }

        setVm({
          ...baseVm,
          selectedCampus: data.selectedCampus ?? null,
        });
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

      {/* ✅ 一番下に表示 */}
      <CampusDetailBox campus={vm.selectedCampus} />
    </main>
  );
}
