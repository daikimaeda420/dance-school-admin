"use client";

import { useEffect, useMemo, useState } from "react";

type ResultRow = {
  id: string;
  title: string;
  sortOrder: number;
  isActive: boolean;
};

type OptionRow = {
  id: string;
  label: string;
  slug?: string; // 返ってくるなら表示できる
};

export default function DiagnosisLinksPage() {
  // いったん手入力（あとで session の schoolId に置き換えOK）
  const [schoolId, setSchoolId] = useState("daiki.maeda.web");

  const [results, setResults] = useState<ResultRow[]>([]);
  const [genres, setGenres] = useState<OptionRow[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string>("");

  const [linkedGenreIds, setLinkedGenreIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canLoad = schoolId.trim().length > 0;

  // 初期ロード：results + genres
  useEffect(() => {
    if (!canLoad) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [rRes, gRes] = await Promise.all([
          fetch(
            `/api/diagnosis/results?schoolId=${encodeURIComponent(
              schoolId
            )}&includeInactive=true`,
            { cache: "no-store" }
          ),
          fetch(
            `/api/diagnosis/genres?schoolId=${encodeURIComponent(schoolId)}`,
            { cache: "no-store" }
          ),
        ]);

        if (!rRes.ok) throw new Error("DiagnosisResult の取得に失敗しました");
        if (!gRes.ok) throw new Error("DiagnosisGenre の取得に失敗しました");

        const r = (await rRes.json()) as ResultRow[];
        const g = (await gRes.json()) as OptionRow[];

        setResults(r);
        setGenres(g);

        if (!selectedResultId && r.length > 0) {
          setSelectedResultId(r[0].id);
        }
      } catch (e: any) {
        setError(e?.message ?? "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  // Result変更時：紐づき（linkedGenreIds）を読む
  useEffect(() => {
    if (!selectedResultId) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/diagnosis/links?type=genres&resultId=${encodeURIComponent(
            selectedResultId
          )}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("紐づき取得に失敗しました");
        const ids = (await res.json()) as string[];
        setLinkedGenreIds(new Set(ids));
      } catch (e: any) {
        setError(e?.message ?? "紐づき取得に失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedResultId]);

  const selectedResult = useMemo(
    () => results.find((r) => r.id === selectedResultId) ?? null,
    [results, selectedResultId]
  );

  const toggleGenre = async (genreId: string) => {
    if (!selectedResultId) return;

    const isLinked = linkedGenreIds.has(genreId);
    setSavingId(genreId);
    setError(null);

    // 楽観更新（失敗時に巻き戻す）
    setLinkedGenreIds((prev) => {
      const next = new Set(prev);
      if (isLinked) next.delete(genreId);
      else next.add(genreId);
      return next;
    });

    try {
      if (!isLinked) {
        const res = await fetch("/api/diagnosis/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "genres",
            resultId: selectedResultId,
            optionId: genreId,
          }),
        });
        if (!res.ok) throw new Error("追加に失敗しました");
      } else {
        const res = await fetch(
          `/api/diagnosis/links?type=genres&resultId=${encodeURIComponent(
            selectedResultId
          )}&optionId=${encodeURIComponent(genreId)}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("削除に失敗しました");
      }
    } catch (e: any) {
      // 巻き戻し
      setLinkedGenreIds((prev) => {
        const next = new Set(prev);
        if (isLinked) next.add(genreId);
        else next.delete(genreId);
        return next;
      });
      setError(e?.message ?? "保存に失敗しました");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl p-6 text-gray-900">
      <div className="mb-4">
        <div className="text-base font-bold">
          診断編集：結果 × ジャンル紐づけ
        </div>
        <div className="text-xs text-gray-500">
          Result を選択 → Genre
          にチェックで紐づけを更新します（_ResultGenres）。
        </div>
      </div>

      {/* schoolId */}
      <div className="mb-4 rounded-2xl border bg-white p-4">
        <div className="mb-2 text-xs font-semibold text-gray-600">schoolId</div>
        <input
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 text-sm"
          placeholder="例：daiki.maeda.web"
        />
        <div className="mt-2 text-[11px] text-gray-500">
          ※ ここは後で「ログイン中ユーザーの schoolId」を自動反映にできます。
        </div>
      </div>

      {/* result selector */}
      <div className="mb-4 rounded-2xl border bg-white p-4">
        <div className="mb-2 text-xs font-semibold text-gray-600">
          対象の診断結果（DiagnosisResult）
        </div>

        <select
          value={selectedResultId}
          onChange={(e) => setSelectedResultId(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 text-sm"
        >
          {results.map((r) => (
            <option key={r.id} value={r.id}>
              [{r.sortOrder}] {r.title} {r.isActive ? "" : "(inactive)"}
            </option>
          ))}
        </select>

        {selectedResult && (
          <div className="mt-2 text-[11px] text-gray-500">
            選択中ID：<span className="font-mono">{selectedResult.id}</span>
          </div>
        )}

        {results.length === 0 && !loading && (
          <div className="mt-2 rounded-xl bg-yellow-50 p-3 text-xs text-yellow-800">
            DiagnosisResult
            がありません。先に結果（DiagnosisResult）を作成してください。
          </div>
        )}
      </div>

      {/* genres */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-600">
            ジャンル（DiagnosisGenre）
          </div>
          <div className="text-[11px] text-gray-500">
            紐づき：{linkedGenreIds.size} 件
          </div>
        </div>

        {loading && (
          <div className="mb-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
            読み込み中...
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {genres.length === 0 && !loading ? (
          <div className="rounded-xl bg-yellow-50 p-3 text-xs text-yellow-800">
            DiagnosisGenre
            が空です。次は「ジャンル追加（CRUD）」を管理画面に作りましょう。
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {genres.map((g) => {
              const checked = linkedGenreIds.has(g.id);
              const busy = savingId === g.id;

              return (
                <label
                  key={g.id}
                  className={[
                    "flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm",
                    checked
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white",
                    busy ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!selectedResultId || busy}
                    onChange={() => toggleGenre(g.id)}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">{g.label}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-gray-500">
                      {g.id}
                      {g.slug ? ` / ${g.slug}` : ""}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
