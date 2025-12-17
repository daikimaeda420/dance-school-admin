// app/admin/diagnosis/genres/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type GenreRow = {
  id: string;
  schoolId: string;
  label: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
};

function slugifyJa(input: string) {
  // ゆるいslug生成（英数・ハイフン中心）。必要ならルールを強化してください。
  const s = (input ?? "").trim().toLowerCase();
  if (!s) return "";
  return s
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-\_]/g, "-")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "");
}

export default function DiagnosisGenresPage() {
  // いったん手入力（後で session の schoolId に置き換えOK）
  const [schoolId, setSchoolId] = useState("daiki.maeda.web");

  const [rows, setRows] = useState<GenreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 新規作成フォーム
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSortOrder, setNewSortOrder] = useState<number>(1);
  const [newIsActive, setNewIsActive] = useState(true);

  // 編集用（行ID単位）
  const [editMap, setEditMap] = useState<Record<string, Partial<GenreRow>>>({});

  const canLoad = schoolId.trim().length > 0;

  const fetchList = async () => {
    if (!canLoad) return;
    setLoading(true);
    setError(null);
    try {
      // 既存GETが isActive:true のみ返す場合があるので、まずは通常GETで読みに行く。
      // 「inactiveも見たい」なら genres API に includeInactive を追加するのがおすすめ。
      const res = await fetch(
        `/api/diagnosis/genres?schoolId=${encodeURIComponent(schoolId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("DiagnosisGenre の取得に失敗しました");
      const data = (await res.json()) as any[];

      // API返却が {id,label,slug} だけの場合もあるので補完
      const normalized: GenreRow[] = data.map((d) => ({
        id: String(d.id),
        schoolId: String(d.schoolId ?? schoolId),
        label: String(d.label ?? ""),
        slug: String(d.slug ?? ""),
        sortOrder: Number(d.sortOrder ?? 1),
        isActive: Boolean(d.isActive ?? true),
      }));

      setRows(normalized.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (e: any) {
      setError(e?.message ?? "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const createGenre = async () => {
    if (!schoolId.trim()) return;

    const id = newId.trim();
    const label = newLabel.trim();
    const slug = newSlug.trim();

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
          sortOrder: newSortOrder,
          isActive: newIsActive,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "作成に失敗しました");
      }

      // フォーム初期化
      setNewId("");
      setNewLabel("");
      setNewSlug("");
      setNewSortOrder(1);
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

    // slug必須
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
          sortOrder: e.sortOrder,
          isActive: e.isActive,
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

  const deactivate = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/diagnosis/genres?id=${encodeURIComponent(
          id
        )}&schoolId=${encodeURIComponent(schoolId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "無効化に失敗しました");
      }
      await fetchList();
    } catch (e: any) {
      setError(e?.message ?? "無効化に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const hintId = useMemo(() => {
    // 例：genre_kpop
    const base = slugifyJa(newLabel) || "genre";
    return `genre_${base}`;
  }, [newLabel]);

  const hintSlug = useMemo(() => {
    // 例：kpop
    return slugifyJa(newLabel);
  }, [newLabel]);

  return (
    <div className="mx-auto w-full max-w-5xl p-6 text-gray-900">
      <div className="mb-4">
        <div className="text-base font-bold">診断編集：ジャンル管理</div>
        <div className="text-xs text-gray-500">
          DiagnosisGenre を追加/編集/無効化します（slug は診断ロジックで必須）。
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
      </div>

      {/* create */}
      <div className="mb-4 rounded-2xl border bg-white p-4">
        <div className="mb-3 text-sm font-semibold">新規追加</div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600">
              label
            </div>
            <input
              value={newLabel}
              onChange={(e) => {
                const v = e.target.value;
                setNewLabel(v);
                // 入力補助（自動入力したい場合）
                if (!newSlug) setNewSlug(slugifyJa(v));
                if (!newId) setNewId(`genre_${slugifyJa(v) || "new"}`);
              }}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="例：K-POP"
            />
            <div className="mt-1 text-[11px] text-gray-500">
              id例：<code className="rounded bg-gray-100 px-1">{hintId}</code> /
              slug例：{" "}
              <code className="rounded bg-gray-100 px-1">
                {hintSlug || "kpop"}
              </code>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600">
              id（text）
            </div>
            <input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm font-mono"
              placeholder="例：genre_kpop"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600">
              slug（診断回答で送る値）
            </div>
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm font-mono"
              placeholder="例：kpop"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs font-semibold text-gray-600">
                sortOrder
              </div>
              <input
                type="number"
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(Number(e.target.value))}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                />
                active
              </label>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={createGenre}
            disabled={saving}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "保存中..." : "追加する"}
          </button>
          <button
            type="button"
            onClick={fetchList}
            disabled={loading}
            className="rounded-full border px-4 py-2 text-sm disabled:opacity-50"
          >
            再読み込み
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* list */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">一覧</div>
          <div className="text-xs text-gray-500">
            {rows.length} 件 {loading ? "（読み込み中）" : ""}
          </div>
        </div>

        {rows.length === 0 && !loading ? (
          <div className="rounded-xl bg-yellow-50 p-3 text-xs text-yellow-800">
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
                  className="rounded-2xl border border-gray-200 p-3"
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
                            className="w-full rounded-xl border px-3 py-2 text-sm"
                          />
                        ) : (
                          r.label
                        )}
                      </div>

                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <div>
                          <div className="text-[11px] font-semibold text-gray-600">
                            id
                          </div>
                          <div className="font-mono text-[12px] text-gray-700">
                            {r.id}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold text-gray-600">
                            slug
                          </div>
                          {editing ? (
                            <input
                              value={current.slug ?? ""}
                              onChange={(ev) =>
                                updateEditField(r.id, { slug: ev.target.value })
                              }
                              className="w-full rounded-xl border px-3 py-2 text-sm font-mono"
                            />
                          ) : (
                            <div className="font-mono text-[12px] text-gray-700">
                              {r.slug}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[11px] font-semibold text-gray-600">
                              sortOrder
                            </div>
                            {editing ? (
                              <input
                                type="number"
                                value={Number(current.sortOrder ?? 1)}
                                onChange={(ev) =>
                                  updateEditField(r.id, {
                                    sortOrder: Number(ev.target.value),
                                  })
                                }
                                className="w-full rounded-xl border px-3 py-2 text-sm"
                              />
                            ) : (
                              <div className="text-[12px] text-gray-700">
                                {r.sortOrder}
                              </div>
                            )}
                          </div>

                          <div className="flex items-end">
                            {editing ? (
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={Boolean(current.isActive)}
                                  onChange={(ev) =>
                                    updateEditField(r.id, {
                                      isActive: ev.target.checked,
                                    })
                                  }
                                />
                                active
                              </label>
                            ) : (
                              <div
                                className={[
                                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                  r.isActive
                                    ? "bg-green-50 text-green-700"
                                    : "bg-gray-100 text-gray-600",
                                ].join(" ")}
                              >
                                {r.isActive ? "active" : "inactive"}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!editing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(r)}
                            disabled={saving}
                            className="rounded-full border px-3 py-1.5 text-xs disabled:opacity-50"
                          >
                            編集
                          </button>

                          <button
                            type="button"
                            onClick={() => deactivate(r.id)}
                            disabled={saving}
                            className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-600 disabled:opacity-50"
                          >
                            無効化
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(r.id)}
                            disabled={saving}
                            className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelEdit(r.id)}
                            disabled={saving}
                            className="rounded-full border px-3 py-1.5 text-xs disabled:opacity-50"
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

      <div className="mt-4 text-xs text-gray-500">
        次：
        <code className="rounded bg-gray-100 px-1">/admin/diagnosis/links</code>
        に戻って、Result と Genre をチェックで紐づけしてください。
      </div>
    </div>
  );
}
