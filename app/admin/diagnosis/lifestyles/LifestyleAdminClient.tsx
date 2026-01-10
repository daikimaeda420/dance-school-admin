// app/admin/diagnosis/lifestyles/LifestyleAdminClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

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
  "border-gray-200 bg-white hover:bg-gray-50 " +
  "dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800";

const btnPrimary =
  "rounded-xl px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700";

export default function LifestyleAdminClient({
  schoolId,
}: {
  schoolId: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 新規追加
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSortOrder, setNewSortOrder] = useState<number>(0);
  const [newIsActive, setNewIsActive] = useState(true);

  const apiBase = useMemo(() => `/api/admin/diagnosis/lifestyles`, []);

  async function fetchRows() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase}?schoolId=${encodeURIComponent(schoolId)}`,
        {
          cache: "no-store",
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "取得に失敗しました");
      setRows(data.lifestyles ?? []);
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
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          label: newLabel,
          slug: newSlug,
          sortOrder: newSortOrder,
          isActive: newIsActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "追加に失敗しました");
      setNewLabel("");
      setNewSlug("");
      setNewSortOrder(0);
      setNewIsActive(true);
      await fetchRows();
    } catch (e: any) {
      setError(e.message ?? "追加に失敗しました");
    } finally {
      setSavingId(null);
    }
  }

  async function patchRow(id: string, patch: Partial<Row>) {
    setError(null);
    setSavingId(id);
    try {
      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "更新に失敗しました");
      // 楽観更新
      setRows((prev) =>
        prev.map((r) => (r.id === id ? ({ ...r, ...patch } as Row) : r))
      );
    } catch (e: any) {
      setError(e.message ?? "更新に失敗しました");
      await fetchRows(); // 念のため戻す
    } finally {
      setSavingId(null);
    }
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
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e.message ?? "削除に失敗しました");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="text-lg font-semibold">年代・ライフスタイル（Q3）</div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          デフォルト6項目が自動で作成されます。追加・編集・削除・並び替えが可能です。
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {/* 新規追加 */}
      <div className={card}>
        <div className="font-semibold">新規追加</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-xs text-gray-500 mb-1">表示ラベル</div>
            <input
              className={input}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="例：社会人（お仕事をしている方）"
            />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">slug（回答値）</div>
            <input
              className={input}
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="例：worker"
            />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">並び順</div>
            <input
              className={input}
              type="number"
              value={newSortOrder}
              onChange={(e) => setNewSortOrder(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
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
        <div className="font-semibold">一覧</div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300">
                <th className="py-2 pr-3">有効</th>
                <th className="py-2 pr-3">ラベル</th>
                <th className="py-2 pr-3">slug</th>
                <th className="py-2 pr-3">並び順</th>
                <th className="py-2 pr-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-gray-100 dark:border-gray-800"
                >
                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={r.isActive}
                      onChange={(e) =>
                        patchRow(r.id, { isActive: e.target.checked })
                      }
                      disabled={savingId === r.id}
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
                      onBlur={(e) => patchRow(r.id, { label: e.target.value })}
                      disabled={savingId === r.id}
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
                      onBlur={(e) => patchRow(r.id, { slug: e.target.value })}
                      disabled={savingId === r.id}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className={input}
                      type="number"
                      value={r.sortOrder}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, sortOrder: Number(e.target.value) }
                              : x
                          )
                        )
                      }
                      onBlur={(e) =>
                        patchRow(r.id, { sortOrder: Number(e.target.value) })
                      }
                      disabled={savingId === r.id}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      className={btn}
                      onClick={() => deleteRow(r.id)}
                      disabled={savingId === r.id}
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
        </div>
      </div>
    </div>
  );
}
