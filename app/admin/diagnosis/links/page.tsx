// app/admin/diagnosis/links/page.tsx
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
  slug?: string;
};

const card =
  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm " +
  "dark:border-gray-800 dark:bg-gray-900";

const input =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
  "disabled:opacity-50 " +
  "dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500";

const selectCls = input;

const infoBox =
  "mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 " +
  "dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300";

const errorBox =
  "mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 " +
  "dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200";

const warnBox =
  "rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800 " +
  "dark:border-yellow-900/40 dark:bg-yellow-950/30 dark:text-yellow-200";

export default function DiagnosisLinksPage() {
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
            {
              cache: "no-store",
            }
          ),
        ]);

        if (!rRes.ok) throw new Error("DiagnosisResult の取得に失敗しました");
        if (!gRes.ok) throw new Error("DiagnosisGenre の取得に失敗しました");

        const r = (await rRes.json()) as ResultRow[];
        const g = (await gRes.json()) as OptionRow[];

        setResults(r);
        setGenres(g);

        // 初回のみ先頭を選択
        setSelectedResultId((prev) => prev || (r[0]?.id ?? ""));
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
    if (!canLoad) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // ✅ schoolId を必ず付けて取得（遷移後もチェックが復元される）
        const res = await fetch(
          `/api/diagnosis/links?type=genres&schoolId=${encodeURIComponent(
            schoolId
          )}&resultId=${encodeURIComponent(selectedResultId)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("紐づき取得に失敗しました");

        const ids = (await res.json()) as unknown;
        const safeIds = Array.isArray(ids) ? ids.map((v) => String(v)) : [];
        setLinkedGenreIds(new Set(safeIds));
      } catch (e: any) {
        setError(e?.message ?? "紐づき取得に失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedResultId, schoolId, canLoad]);

  const selectedResult = useMemo(
    () => results.find((r) => r.id === selectedResultId) ?? null,
    [results, selectedResultId]
  );

  // ✅ ここが重要：変更後の set をそのまま server に "set" で反映する
  const saveAll = async (nextSet: Set<string>) => {
    const genreIds = Array.from(nextSet);

    const res = await fetch("/api/diagnosis/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId,
        resultId: selectedResultId,
        genreIds, // ✅ id配列で送る（slugではない）
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message ?? "保存に失敗しました");
    }
  };

  const toggleGenre = async (genreId: string) => {
    if (!selectedResultId) return;

    setSavingId(genreId);
    setError(null);

    // 変更後の状態を作る
    const prevSet = linkedGenreIds;
    const nextSet = new Set(prevSet);
    if (nextSet.has(genreId)) nextSet.delete(genreId);
    else nextSet.add(genreId);

    // 楽観更新
    setLinkedGenreIds(nextSet);

    try {
      await saveAll(nextSet); // ✅ まとめて "set" 更新
    } catch (e: any) {
      // 巻き戻し
      setLinkedGenreIds(prevSet);
      setError(e?.message ?? "保存に失敗しました");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl p-6 text-gray-900 dark:text-gray-100">
      <div className="mb-4">
        <div className="text-base font-bold">
          診断編集：結果 × ジャンル紐づけ
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Result を選択 → Genre にチェックで紐づけを更新します（_ResultGenres /
          set更新）。
        </div>
      </div>

      {/* schoolId */}
      <div className={`mb-4 ${card}`}>
        <div className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
          schoolId
        </div>
        <input
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          className={input}
          placeholder="例：daiki.maeda.web"
        />
        <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
          ※ ここは後で「ログイン中ユーザーの schoolId」を自動反映にできます。
        </div>
      </div>

      {/* result selector */}
      <div className={`mb-4 ${card}`}>
        <div className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
          対象の診断結果（DiagnosisResult）
        </div>

        <select
          value={selectedResultId}
          onChange={(e) => setSelectedResultId(e.target.value)}
          className={selectCls}
        >
          {results.map((r) => (
            <option key={r.id} value={r.id}>
              [{r.sortOrder}] {r.title} {r.isActive ? "" : "(inactive)"}
            </option>
          ))}
        </select>

        {selectedResult && (
          <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
            選択中ID：{" "}
            <span className="font-mono text-gray-700 dark:text-gray-200">
              {selectedResult.id}
            </span>
          </div>
        )}

        {results.length === 0 && !loading && (
          <div className={`mt-2 ${warnBox}`}>
            DiagnosisResult
            がありません。先に結果（DiagnosisResult）を作成してください。
          </div>
        )}
      </div>

      {/* genres */}
      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            ジャンル（DiagnosisGenre）
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            紐づき：{linkedGenreIds.size} 件
          </div>
        </div>

        {loading && <div className={infoBox}>読み込み中...</div>}
        {error && <div className={errorBox}>{error}</div>}

        {genres.length === 0 && !loading ? (
          <div className={warnBox}>
            DiagnosisGenre が空です。先にジャンルを作成してください。
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
                    "flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition",
                    "hover:bg-gray-50 dark:hover:bg-gray-800/40",
                    checked
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900",
                    busy ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!selectedResultId || busy}
                    onChange={() => toggleGenre(g.id)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-700"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {g.label}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                      {g.id}
                      {g.slug ? ` / ${g.slug}` : ""}
                    </div>
                  </div>

                  {busy && (
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">
                      保存中…
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
