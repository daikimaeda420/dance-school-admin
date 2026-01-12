// app/admin/diagnosis/lifestyles/LifestyleAdminClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Row = {
  id: string;
  schoolId: string;
  label: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
};

const card =
  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm " +
  "dark:border-gray-800 dark:bg-gray-900";

const input =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
  "disabled:opacity-50 " +
  "dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500";

const btn =
  "rounded-xl px-3 py-2 text-sm font-medium border " +
  "border-gray-200 bg-white hover:bg-gray-50 text-gray-900 " +
  "dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-gray-100";

const btnDanger =
  "rounded-xl px-3 py-2 text-sm font-medium border " +
  "border-red-200 bg-white hover:bg-red-50 text-red-700 " +
  "dark:border-red-900 dark:bg-gray-900 dark:hover:bg-red-950 dark:text-red-200";

const btnPrimary =
  "rounded-xl px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600";

function normalizeRowsWithOrder(rows: Row[]) {
  // 並び順は UI では見せないが、保存時に必要なので state には持たせる
  return rows
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r, i) => ({ ...r, sortOrder: i + 1 }));
}

function isRowEqual(a: Row, b: Row) {
  return (
    a.label === b.label &&
    a.slug === b.slug &&
    a.isActive === b.isActive &&
    a.sortOrder === b.sortOrder
  );
}

export default function LifestyleAdminClient({
  schoolId,
}: {
  schoolId: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 新規追加（並び順は入力させず末尾に自動付与）
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);

  const apiBase = useMemo(() => `/api/admin/diagnosis/lifestyles`, []);
  const originalRef = useRef<Row[]>([]);

  // DnD
  const dragIdRef = useRef<string | null>(null);
  const overIdRef = useRef<string | null>(null);

  const dirty = useMemo(() => {
    const orig = originalRef.current;
    if (orig.length !== rows.length) return true;
    for (let i = 0; i < rows.length; i++) {
      if (!orig[i]) return true;
      if (rows[i].id !== orig[i].id) return true; // 順番が変わった
      if (!isRowEqual(rows[i], orig[i])) return true;
    }
    return false;
  }, [rows]);

  async function fetchRows() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase}?schoolId=${encodeURIComponent(schoolId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "取得に失敗しました");

      const normalized = normalizeRowsWithOrder(data.lifestyles ?? []);
      setRows(normalized);
      originalRef.current = normalized;
    } catch (e: any) {
      setError(e.message ?? "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!schoolId) return;
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  async function createRow() {
    setError(null);
    setSavingId("new");
    try {
      const nextOrder = rows.length + 1;

      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          label: newLabel,
          slug: newSlug,
          sortOrder: nextOrder,
          isActive: newIsActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "追加に失敗しました");

      setNewLabel("");
      setNewSlug("");
      setNewIsActive(true);

      await fetchRows();
    } catch (e: any) {
      setError(e.message ?? "追加に失敗しました");
    } finally {
      setSavingId(null);
    }
  }

  async function patchRowApi(id: string, patch: Partial<Row>) {
    const res = await fetch(apiBase, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message ?? "更新に失敗しました");
    return data;
  }

  async function deleteRow(id: string) {
    if (!confirm("削除しますか？")) return;
    setError(null);
    setSavingId(id);
    try {
      const res = await fetch(apiBase, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "削除に失敗しました");

      // 削除は即時反映 & 並び順詰める（未保存編集と衝突しにくいようにそのまま state 更新）
      const next = normalizeRowsWithOrder(rows.filter((r) => r.id !== id));
      setRows(next);

      // サーバー側は削除のみでOKだが、sortOrder詰めが必要なら保存を促す
      // ここでは「保存」ボタンに任せる（dirtyになる）
    } catch (e: any) {
      setError(e.message ?? "削除に失敗しました");
    } finally {
      setSavingId(null);
    }
  }

  function reorderByIds(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    setRows((prev) => {
      const list = prev.slice();
      const from = list.findIndex((x) => x.id === sourceId);
      const to = list.findIndex((x) => x.id === targetId);
      if (from < 0 || to < 0) return prev;

      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);

      return normalizeRowsWithOrder(list);
    });
  }

  async function saveAll() {
    setError(null);
    setSaving(true);
    try {
      const orig = originalRef.current;

      // 差分がある行だけPATCH（順番も含む）
      for (let i = 0; i < rows.length; i++) {
        const cur = rows[i];
        const before = orig.find((x) => x.id === cur.id);

        // 新規追加は fetchRows で同期済み想定（ここには来ないはず）
        if (!before) continue;

        if (!isRowEqual(cur, before)) {
          await patchRowApi(cur.id, {
            label: cur.label,
            slug: cur.slug,
            isActive: cur.isActive,
            sortOrder: cur.sortOrder,
          });
        }
      }

      // 保存後にサーバーの真実で取り直す（表示も安定）
      await fetchRows();
    } catch (e: any) {
      setError(e.message ?? "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  function resetEdits() {
    setRows(originalRef.current);
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          年代・ライフスタイル（Q3）
        </div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          デフォルト6項目が自動で作成されます。追加・編集・削除・並び替えが可能です。
          <br />
          並び替えはドラッグ＆ドロップで行い、最後に「変更を保存」を押してください。
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {/* 新規追加 */}
      <div className={card}>
        <div className="font-semibold text-gray-900 dark:text-gray-100">
          新規追加
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              表示ラベル
            </div>
            <input
              className={input}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="例：社会人（お仕事をしている方）"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              slug（回答値）
            </div>
            <input
              className={input}
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="例：worker"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={newIsActive}
              onChange={(e) => setNewIsActive(e.target.checked)}
            />
            有効
          </label>

          <button
            className={btnPrimary}
            onClick={createRow}
            disabled={savingId === "new" || !newLabel.trim() || !newSlug.trim()}
          >
            {savingId === "new" ? "追加中..." : "追加"}
          </button>

          <button className={btn} onClick={fetchRows} disabled={loading}>
            {loading ? "更新中..." : "再読込"}
          </button>
        </div>
      </div>

      {/* 一覧 */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            一覧
          </div>

          <div className="flex items-center gap-2">
            <button
              className={btn}
              onClick={resetEdits}
              disabled={!dirty || saving}
            >
              変更を破棄
            </button>
            <button
              className={btnPrimary}
              onClick={saveAll}
              disabled={!dirty || saving}
            >
              {saving ? "保存中..." : "変更を保存"}
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300">
                <th className="py-2 pr-3 w-10" title="ドラッグして並び替え">
                  ⇅
                </th>
                <th className="py-2 pr-3">有効</th>
                <th className="py-2 pr-3">ラベル</th>
                <th className="py-2 pr-3">slug</th>
                <th className="py-2 pr-3">操作</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={
                    "border-t border-gray-100 dark:border-gray-800 " +
                    "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  }
                  draggable
                  onDragStart={() => {
                    dragIdRef.current = r.id;
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    overIdRef.current = r.id;
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = dragIdRef.current;
                    const to = overIdRef.current;
                    if (from && to) reorderByIds(from, to);
                    dragIdRef.current = null;
                    overIdRef.current = null;
                  }}
                >
                  {/* ハンドル（見た目用。行自体を draggable にしてる） */}
                  <td className="py-2 pr-3 text-gray-400 dark:text-gray-500 select-none">
                    ≡
                  </td>

                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={r.isActive}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, isActive: e.target.checked }
                              : x
                          )
                        )
                      }
                      disabled={savingId === r.id || saving}
                    />
                  </td>

                  <td className="py-2 pr-3">
                    <input
                      className={input}
                      value={r.label}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, label: e.target.value } : x
                          )
                        )
                      }
                      disabled={savingId === r.id || saving}
                    />
                  </td>

                  <td className="py-2 pr-3">
                    <input
                      className={input}
                      value={r.slug}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, slug: e.target.value } : x
                          )
                        )
                      }
                      disabled={savingId === r.id || saving}
                    />
                  </td>

                  <td className="py-2 pr-3">
                    <button
                      className={btnDanger}
                      onClick={() => deleteRow(r.id)}
                      disabled={savingId === r.id || saving}
                    >
                      {savingId === r.id ? "処理中..." : "削除"}
                    </button>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td
                    className="py-4 text-gray-500 dark:text-gray-400"
                    colSpan={5}
                  >
                    データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            ※
            行をドラッグして並び替えできます（「≡」付近をつかむとやりやすいです）
          </div>
        </div>
      </div>
    </div>
  );
}
