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

/* =========================
   UI styles
========================= */
const card =
  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm " +
  "dark:border-gray-800 dark:bg-gray-900";

const input =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm " +
  "text-gray-900 placeholder:text-gray-400 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 " +
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
  "rounded-xl px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 " +
  "disabled:opacity-50 disabled:hover:bg-blue-600";

/* =========================
   helpers
========================= */
function normalizeRowsWithOrder(rows: Row[]) {
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

/* =========================
   Component
========================= */
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

  // 新規追加
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);

  const apiBase = useMemo(() => `/api/admin/diagnosis/lifestyles`, []);
  const originalRef = useRef<Row[]>([]);

  // Drag & Drop
  const dragIdRef = useRef<string | null>(null);
  const overIdRef = useRef<string | null>(null);

  const dirty = useMemo(() => {
    const orig = originalRef.current;
    if (orig.length !== rows.length) return true;
    for (let i = 0; i < rows.length; i++) {
      if (!orig[i]) return true;
      if (rows[i].id !== orig[i].id) return true;
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
      for (const cur of rows) {
        const before = orig.find((x) => x.id === cur.id);
        if (!before) continue;
        if (!isRowEqual(cur, before)) {
          await fetch(apiBase, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: cur.id,
              label: cur.label,
              slug: cur.slug,
              isActive: cur.isActive,
              sortOrder: cur.sortOrder,
            }),
          });
        }
      }
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

  /* =========================
     Render
  ========================= */
  return (
    <div className="space-y-4 text-gray-900 dark:text-gray-100">
      {/* Header */}
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

      {/* Error */}
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
            disabled={!newLabel.trim() || !newSlug.trim()}
          >
            追加
          </button>

          <button className={btn} onClick={fetchRows} disabled={loading}>
            {loading ? "更新中..." : "再読込"}
          </button>
        </div>
      </div>

      {/* 一覧 */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            一覧
          </div>

          <div className="flex items-center gap-2">
            <button className={btn} onClick={resetEdits} disabled={!dirty}>
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

        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-gray-600 dark:text-gray-300">
              <th className="py-2 w-10">⇅</th>
              <th className="py-2">有効</th>
              <th className="py-2">ラベル</th>
              <th className="py-2">slug</th>
              <th className="py-2">操作</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                draggable
                onDragStart={() => (dragIdRef.current = r.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  overIdRef.current = r.id;
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIdRef.current && overIdRef.current) {
                    reorderByIds(dragIdRef.current, overIdRef.current);
                  }
                }}
                className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40"
              >
                <td className="text-gray-400 dark:text-gray-500">≡</td>
                <td>
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
                  />
                </td>
                <td>
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
                  />
                </td>
                <td>
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
                  />
                </td>
                <td>
                  <button className={btnDanger}>削除</button>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-4 text-center text-gray-500 dark:text-gray-400"
                >
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
