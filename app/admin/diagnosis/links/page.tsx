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

type LinkType = "genres" | "campuses";

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

const tabBtnBase =
  "rounded-xl px-3 py-2 text-xs font-semibold transition " +
  "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 " +
  "dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900";

const tabBtnActive =
  "border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-50 " +
  "dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-950/30";

export default function DiagnosisLinksPage() {
  const [schoolId, setSchoolId] = useState("daiki.maeda.web");

  const [results, setResults] = useState<ResultRow[]>([]);
  const [genres, setGenres] = useState<OptionRow[]>([]);
  const [campuses, setCampuses] = useState<OptionRow[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string>("");

  const [linkType, setLinkType] = useState<LinkType>("genres");

  // 現在のタブの「紐づきID集合」
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canLoad = schoolId.trim().length > 0;

  const selectedResult = useMemo(
    () => results.find((r) => r.id === selectedResultId) ?? null,
    [results, selectedResultId]
  );

  const optionsForTab = useMemo(() => {
    return linkType === "genres" ? genres : campuses;
  }, [linkType, genres, campuses]);

  const tabLabel = linkType === "genres" ? "ジャンル" : "校舎";

  // 初期ロード：results + genres + campuses
  useEffect(() => {
    if (!canLoad) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [rRes, gRes, cRes] = await Promise.all([
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
          fetch(
            `/api/diagnosis/campuses?schoolId=${encodeURIComponent(schoolId)}`,
            { cache: "no-store" }
          ),
        ]);

        if (!rRes.ok) throw new Error("DiagnosisResult の取得に失敗しました");
        if (!gRes.ok) throw new Error("DiagnosisGenre の取得に失敗しました");
        if (!cRes.ok) throw new Error("DiagnosisCampus の取得に失敗しました");

        const r = (await rRes.json()) as ResultRow[];
        const g = (await gRes.json()) as OptionRow[];
        const c = (await cRes.json()) as OptionRow[];

        setResults(r);
        setGenres(g);
        setCampuses(c);

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

  // Result または タブ変更時：紐づき（linkedIds）を読む
  useEffect(() => {
    if (!selectedResultId) return;
    if (!canLoad) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/diagnosis/links?type=${encodeURIComponent(
            linkType
          )}&schoolId=${encodeURIComponent(
            schoolId
          )}&resultId=${encodeURIComponent(selectedResultId)}`,
          { cache: "no-store" }
        );

        // GETは200配列方針だが、念のため
        if (!res.ok) throw new Error("紐づき取得に失敗しました");

        const ids = (await res.json()) as unknown;
        const safeIds = Array.isArray(ids) ? ids.map((v) => String(v)) : [];
        setLinkedIds(new Set(safeIds));
      } catch (e: any) {
        setError(e?.message ?? "紐づき取得に失敗しました");
        setLinkedIds(new Set());
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedResultId, schoolId, canLoad, linkType]);

  // ✅ まとめて "set" で反映（genres/campuses 共通）
  const saveAll = async (nextSet: Set<string>) => {
    const ids = Array.from(nextSet);

    const body: any = {
      type: linkType,
      schoolId,
      resultId: selectedResultId,
    };

    if (linkType === "genres") body.genreIds = ids;
    if (linkType === "campuses") body.campusIds = ids;

    const res = await fetch("/api/diagnosis/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message ?? "保存に失敗しました");
    }
  };

  const toggle = async (id: string) => {
    if (!selectedResultId) return;

    setSavingId(id);
    setError(null);

    const prevSet = linkedIds;
    const nextSet = new Set(prevSet);
    if (nextSet.has(id)) nextSet.delete(id);
    else nextSet.add(id);

    // 楽観更新
    setLinkedIds(nextSet);

    try {
      await saveAll(nextSet);
    } catch (e: any) {
      setLinkedIds(prevSet);
      setError(e?.message ?? "保存に失敗しました");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl p-6 text-gray-900 dark:text-gray-100">
      <div className="mb-4">
        <div className="text-base font-bold">診断編集：結果 × 紐づけ</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Result を選択 → タブ（ジャンル/校舎）を切替 →
          チェックで紐づけを更新します（set更新）。
        </div>

        {/* tabs */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className={[
              tabBtnBase,
              linkType === "genres" ? tabBtnActive : "",
            ].join(" ")}
            onClick={() => setLinkType("genres")}
          >
            ジャンル
          </button>
          <button
            type="button"
            className={[
              tabBtnBase,
              linkType === "campuses" ? tabBtnActive : "",
            ].join(" ")}
            onClick={() => setLinkType("campuses")}
          >
            校舎
          </button>
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

      {/* options (genres/campuses) */}
      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            {tabLabel}（
            {linkType === "genres" ? "DiagnosisGenre" : "DiagnosisCampus"}）
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            紐づき：{linkedIds.size} 件
          </div>
        </div>

        {loading && <div className={infoBox}>読み込み中...</div>}
        {error && <div className={errorBox}>{error}</div>}

        {optionsForTab.length === 0 && !loading ? (
          <div className={warnBox}>
            {linkType === "genres"
              ? "DiagnosisGenre が空です。先にジャンルを作成してください。"
              : "DiagnosisCampus が空です。先に校舎を作成してください。"}
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {optionsForTab.map((o) => {
              const checked = linkedIds.has(o.id);
              const busy = savingId === o.id;

              return (
                <label
                  key={o.id}
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
                    onChange={() => toggle(o.id)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-700"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {o.label}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                      {o.id}
                      {o.slug ? ` / ${o.slug}` : ""}
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
