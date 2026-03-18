// app/admin/diagnosis/lifestyles/LifestyleAdminClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AdminPageHeader from "../_components/AdminPageHeader";
import {
  adminCard,
  adminInput,
  adminBtn,
  adminBtnPrimary,
  adminBtnDanger,
} from "../_components/adminStyles";

type Row = {
  id: string;
  schoolId: string;
  label: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
};

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

  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);

  const apiBase = useMemo(() => `/api/admin/diagnosis/lifestyles`, []);
  const originalRef = useRef<Row[]>([]);

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
    const url = `${apiBase}?schoolId=${encodeURIComponent(schoolId)}`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();

      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // JSONじゃない（404 HTMLなど）
      }

      if (!res.ok) {
        const msg =
          data?.message ??
          `HTTP ${res.status} ${
            res.statusText
          }\nURL: ${url}\n\nBODY:\n${text.slice(0, 500)}`;
        throw new Error(msg);
      }

      const normalized = normalizeRowsWithOrder(data?.lifestyles ?? []);
      setRows(normalized);
      originalRef.current = normalized;
    } catch (e: any) {
      setError(e?.message ?? "取得に失敗しました");
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

      const next = normalizeRowsWithOrder(rows.filter((r) => r.id !== id));
      setRows(next);
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

      for (let i = 0; i < rows.length; i++) {
        const cur = rows[i];
        const before = orig.find((x) => x.id === cur.id);
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
      <AdminPageHeader
        title="年代・ライフスタイル（Q3）"
        description="デフォルト6項目が自動で作成されます。追加・編集・削除・並び替えが可能です。並び替えはドラッグ＆ドロップで行い、最後に「保存」を押してください。"
        isDirty={dirty}
        saving={saving}
        error={error}
        onSave={saveAll}
        onDiscard={resetEdits}
      />

      {/* 新規追加 */}
      <div className={adminCard}>
        <div className="font-semibold text-gray-900 dark:text-gray-100">
          新規追加
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              表示ラベル
            </div>
            <input
              className={adminInput}
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
              className={adminInput}
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
            className={adminBtnPrimary}
            onClick={createRow}
            disabled={savingId === "new" || !newLabel.trim() || !newSlug.trim()}
          >
            {savingId === "new" ? "追加中..." : "追加"}
          </button>

          <button className={adminBtn} onClick={fetchRows} disabled={loading}>
            {loading ? "更新中..." : "再読込"}
          </button>
        </div>
      </div>

      {/* 一覧 */}
      <div className={adminCard}>
        <div className="font-semibold text-gray-900 dark:text-gray-100">
          一覧
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
                  <td className="py-2 pr-3 text-gray-400 dark:text-gray-500 select-none cursor-move">
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
                      className={adminInput}
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
                      className={adminInput}
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
                      className={adminBtnDanger}
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
