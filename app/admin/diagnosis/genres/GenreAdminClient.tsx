// app/admin/diagnosis/genres/GenreAdminClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  initialSchoolId?: string;
};

type GenreRow = {
  id: string;
  schoolId: string;
  label: string;
  slug: string;
  answerTag?: string | null; // Q4固定回答IDと紐づけ
  sortOrder: number; // UIでは触らない（互換のため保持）
  isActive: boolean;
};

function slugifyJa(input: string) {
  const s = (input ?? "").trim().toLowerCase();
  if (!s) return "";
  return s
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-\_]/g, "-")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "");
}

const card =
  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm " +
  "dark:border-gray-800 dark:bg-gray-900";

const input =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
  "disabled:opacity-50 " +
  "dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500";

const monoInput = input + " font-mono";

const codePill =
  "rounded bg-gray-100 px-1 py-0.5 text-[11px] text-gray-800 " +
  "dark:bg-gray-800 dark:text-gray-100";

const btnPrimary =
  "rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white " +
  "hover:bg-blue-700 disabled:opacity-50 " +
  "dark:bg-blue-500 dark:hover:bg-blue-400";

const btnOutline =
  "rounded-full border border-gray-300 bg-white px-4 py-2 text-sm " +
  "hover:bg-gray-50 disabled:opacity-50 " +
  "dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800";

const btnDanger =
  "rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs text-red-600 " +
  "hover:bg-red-50 disabled:opacity-50 " +
  "dark:border-red-900/50 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/40";

const pillActive =
  "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-200";
const pillInactive =
  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";

// ✅ Q4固定質問（仕様書通り）
const GENRE_ANSWER_TAG_OPTIONS: { value: string; label: string }[] = [
  { value: "Genre_KPOP", label: "K-POP・流行りの曲" },
  { value: "Genre_HIPHOP", label: "重低音の効いたカッコいい洋楽" },
  { value: "Genre_JAZZ", label: "オシャレでゆったりした曲" },
  { value: "Genre_ThemePark", label: "とにかく明るく楽しい曲" },
  { value: "Genre_All", label: "まだ迷っている・色々見てみたい" },
];

export default function GenreAdminClient({ initialSchoolId }: Props) {
  const [schoolId, setSchoolId] = useState<string>(initialSchoolId ?? "");

  const [rows, setRows] = useState<GenreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 新規作成フォーム
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newAnswerTag, setNewAnswerTag] = useState<string>(""); // 空=未設定
  const [newIsActive, setNewIsActive] = useState(true);

  // 編集用（行ID単位）
  const [editMap, setEditMap] = useState<Record<string, Partial<GenreRow>>>({});

  const canLoad = schoolId.trim().length > 0;

  const fetchList = async () => {
    if (!canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/diagnosis/genres?schoolId=${encodeURIComponent(
          schoolId
        )}&includeInactive=true`,
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error("DiagnosisGenre の取得に失敗しました");
      const data = (await res.json()) as any[];

      const normalized: GenreRow[] = data.map((d) => ({
        id: String(d.id),
        schoolId: String(d.schoolId ?? schoolId),
        label: String(d.label ?? ""),
        slug: String(d.slug ?? ""),
        answerTag: d.answerTag ?? null,
        sortOrder: Number(d.sortOrder ?? 1),
        isActive: Boolean(d.isActive ?? true),
      }));

      // ✅ ソート機能はUIから消す：見た目の並びは label 昇順に固定
      normalized.sort((a, b) =>
        (a.label || "").localeCompare(b.label || "", "ja")
      );

      setRows(normalized);
    } catch (e: any) {
      setError(e?.message ?? "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canLoad) void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const createGenre = async () => {
    if (!schoolId.trim()) return;

    const id = newId.trim();
    const label = newLabel.trim();
    const slug = newSlug.trim();
    const answerTag = newAnswerTag.trim() || null;

    if (!id || !label || !slug) {
      setError("id / label / slug は必須です");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnosis/genres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          schoolId,
          label,
          slug,
          answerTag,
          // sortOrder は互換のため送る（UIでは触らない）
          sortOrder: 1,
          isActive: newIsActive,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "作成に失敗しました");
      }

      setNewId("");
      setNewLabel("");
      setNewSlug("");
      setNewAnswerTag("");
      setNewIsActive(true);

      await fetchList();
    } catch (e: any) {
      setError(e?.message ?? "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r: GenreRow) => {
    setEditMap((prev) => ({
      ...prev,
      [r.id]: { ...r },
    }));
  };

  const cancelEdit = (id: string) => {
    setEditMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateEditField = (id: string, patch: Partial<GenreRow>) => {
    setEditMap((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), ...patch },
    }));
  };

  const saveEdit = async (id: string) => {
    const e = editMap[id];
    if (!e) return;

    if (!e.slug?.trim() || !e.label?.trim()) {
      setError("label / slug は必須です");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnosis/genres", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          schoolId,
          label: e.label,
          slug: e.slug,
          answerTag: (e.answerTag ?? "").trim() || null,
          // sortOrder は既存値維持（UIでは触らない）
          sortOrder: e.sortOrder ?? 1,
          isActive: Boolean(e.isActive),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "更新に失敗しました");
      }

      cancelEdit(id);
      await fetchList();
    } catch (e: any) {
      setError(e?.message ?? "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // ✅ 休校(=isActive false) / アクティブ切替（編集に入らず即反映）
  const toggleActive = async (r: GenreRow, next: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnosis/genres", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: r.id,
          schoolId,
          label: r.label,
          slug: r.slug,
          answerTag: r.answerTag ?? null,
          sortOrder: r.sortOrder ?? 1,
          isActive: next,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "更新に失敗しました");
      }
      await fetchList();
    } catch (e: any) {
      setError(e?.message ?? "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // ✅ 削除（物理削除想定：hard=true）
  const deleteGenre = async (r: GenreRow) => {
    const ok = confirm(`「${r.label}」を削除しますか？\n※元に戻せません`);
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/diagnosis/genres?id=${encodeURIComponent(
          r.id
        )}&schoolId=${encodeURIComponent(schoolId)}&hard=true`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "削除に失敗しました");
      }
      await fetchList();
    } catch (e: any) {
      setError(e?.message ?? "削除に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const hintId = useMemo(() => {
    const base = slugifyJa(newLabel) || "genre";
    return `genre_${base}`;
  }, [newLabel]);

  const hintSlug = useMemo(() => slugifyJa(newLabel), [newLabel]);

  const answerTagLabel = (tag?: string | null) =>
    GENRE_ANSWER_TAG_OPTIONS.find((x) => x.value === tag)?.label ?? "未設定";

  return (
    <div className="mx-auto w-full max-w-5xl p-6 text-gray-900 dark:text-gray-100">
      <div className="mb-4">
        <div className="text-base font-bold">診断編集：ジャンル管理</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          DiagnosisGenre を追加/編集/休校(OFF)/削除します（Q4は answerTag
          で紐づけ）。
        </div>
      </div>

      {/* create */}
      <div className={`mb-4 ${card}`}>
        <div className="mb-3 text-sm font-semibold">新規追加</div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              label
            </div>
            <input
              value={newLabel}
              onChange={(e) => {
                const v = e.target.value;
                setNewLabel(v);
                if (!newSlug) setNewSlug(slugifyJa(v));
                if (!newId) setNewId(`genre_${slugifyJa(v) || "new"}`);
              }}
              className={input}
              placeholder="例：K-POP"
            />
            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              id例：<code className={codePill}>{hintId}</code> / slug例：{" "}
              <code className={codePill}>{hintSlug || "kpop"}</code>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              id（text）
            </div>
            <input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className={monoInput}
              placeholder="例：genre_kpop"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              slug（管理用）
            </div>
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className={monoInput}
              placeholder="例：kpop"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              answerTag（診断Q4の固定回答と紐づけ）
            </div>
            <select
              value={newAnswerTag}
              onChange={(e) => setNewAnswerTag(e.target.value)}
              className={input}
            >
              <option value="">未設定（診断Q4と紐づけない）</option>
              {GENRE_ANSWER_TAG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}（{o.value}）
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              例：Q4で「K-POP・流行りの曲」を選ぶと{" "}
              <code className={codePill}>Genre_KPOP</code> が送られます。
            </div>
          </div>

          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={newIsActive}
                onChange={(e) => setNewIsActive(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-700"
              />
              アクティブ（ON）
            </label>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={createGenre}
            disabled={saving}
            className={btnPrimary}
          >
            {saving ? "保存中..." : "追加する"}
          </button>
          <button
            type="button"
            onClick={fetchList}
            disabled={loading}
            className={btnOutline}
          >
            再読み込み
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {/* list */}
      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">一覧</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {rows.length} 件 {loading ? "（読み込み中）" : ""}
          </div>
        </div>

        {rows.length === 0 && !loading ? (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800 dark:border-yellow-900/40 dark:bg-yellow-950/30 dark:text-yellow-200">
            まだジャンルがありません。上のフォームから追加してください。
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const editing = editMap[r.id] !== undefined;
              const e = editMap[r.id] as Partial<GenreRow> | undefined;
              const current = editing ? (e as GenreRow) : r;

              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold">
                        {editing ? (
                          <input
                            value={current.label ?? ""}
                            onChange={(ev) =>
                              updateEditField(r.id, { label: ev.target.value })
                            }
                            className={input}
                          />
                        ) : (
                          r.label
                        )}
                      </div>

                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <div>
                          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                            id
                          </div>
                          <div className="font-mono text-[12px] text-gray-700 dark:text-gray-200">
                            {r.id}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                            slug
                          </div>
                          {editing ? (
                            <input
                              value={current.slug ?? ""}
                              onChange={(ev) =>
                                updateEditField(r.id, { slug: ev.target.value })
                              }
                              className={monoInput}
                            />
                          ) : (
                            <div className="font-mono text-[12px] text-gray-700 dark:text-gray-200">
                              {r.slug}
                            </div>
                          )}
                        </div>

                        {/* ✅ アクティブ ON/OFF */}
                        <div className="flex items-end justify-between gap-2">
                          {editing ? (
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                              <input
                                type="checkbox"
                                checked={Boolean(current.isActive)}
                                onChange={(ev) =>
                                  updateEditField(r.id, {
                                    isActive: ev.target.checked,
                                  })
                                }
                                className="rounded border-gray-300 dark:border-gray-700"
                              />
                              アクティブ（ON）
                            </label>
                          ) : (
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                <input
                                  type="checkbox"
                                  checked={r.isActive}
                                  disabled={saving}
                                  onChange={(ev) =>
                                    void toggleActive(r, ev.target.checked)
                                  }
                                  className="rounded border-gray-300 dark:border-gray-700"
                                />
                                アクティブ
                              </label>
                              <div
                                className={[
                                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                  r.isActive ? pillActive : pillInactive,
                                ].join(" ")}
                              >
                                {r.isActive ? "ON" : "休校"}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* answerTag 表示/編集 */}
                      <div className="mt-3">
                        <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                          answerTag（診断Q4と紐づけ）
                        </div>
                        {editing ? (
                          <select
                            value={(current.answerTag ?? "") as string}
                            onChange={(ev) =>
                              updateEditField(r.id, {
                                answerTag: ev.target.value || null,
                              })
                            }
                            className={input}
                          >
                            <option value="">未設定</option>
                            {GENRE_ANSWER_TAG_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}（{o.value}）
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="mt-1 inline-flex items-center gap-2">
                            <span
                              className={[
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                r.answerTag
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
                              ].join(" ")}
                            >
                              {r.answerTag ?? "未設定"}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                              {answerTagLabel(r.answerTag)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!editing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(r)}
                            disabled={saving}
                            className={btnOutline.replace(
                              "px-4 py-2 text-sm",
                              "px-3 py-1.5 text-xs"
                            )}
                          >
                            編集
                          </button>

                          {/* ✅ 削除 */}
                          <button
                            type="button"
                            onClick={() => void deleteGenre(r)}
                            disabled={saving}
                            className={btnDanger}
                          >
                            削除
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(r.id)}
                            disabled={saving}
                            className={btnPrimary.replace(
                              "px-4 py-2 text-sm",
                              "px-3 py-1.5 text-xs"
                            )}
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelEdit(r.id)}
                            disabled={saving}
                            className={btnOutline.replace(
                              "px-4 py-2 text-sm",
                              "px-3 py-1.5 text-xs"
                            )}
                          >
                            キャンセル
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        次：<code className={codePill}>/admin/diagnosis/links</code>
        に戻って、Result と Genre をチェックで紐づけしてください。
      </div>
    </div>
  );
}
