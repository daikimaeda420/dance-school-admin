"use client";

import { useEffect, useState } from "react";

type Instructor = {
  id: string;
  schoolId: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
};

export default function InstructorAdminClient({
  schoolId,
}: {
  schoolId: string;
}) {
  const [rows, setRows] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 新規追加フォーム
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSortOrder, setNewSortOrder] = useState<number>(0);
  const [newIsActive, setNewIsActive] = useState(true);

  async function fetchRows() {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/diagnosis/instructors?schoolId=${encodeURIComponent(
          schoolId
        )}`,
        {
          cache: "no-store",
        }
      );
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const data = (await res.json()) as Instructor[];
      setRows(data);
    } catch (e) {
      setError("講師一覧の取得に失敗しました。");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  async function addRow() {
    setError(null);
    try {
      const res = await fetch("/api/admin/diagnosis/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          name: newName,
          slug: newSlug,
          sortOrder: newSortOrder,
          isActive: newIsActive,
        }),
      });
      if (!res.ok) throw new Error(`create failed: ${res.status}`);
      setNewName("");
      setNewSlug("");
      setNewSortOrder(0);
      setNewIsActive(true);
      await fetchRows();
    } catch (e) {
      setError("作成に失敗しました。");
      console.error(e);
    }
  }

  async function saveRow(r: Instructor) {
    setError(null);
    setSavingId(r.id);
    try {
      const res = await fetch(`/api/admin/diagnosis/instructors/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: r.name,
          slug: r.slug,
          sortOrder: r.sortOrder,
          isActive: r.isActive,
        }),
      });
      if (!res.ok) throw new Error(`update failed: ${res.status}`);
    } catch (e) {
      setError("保存に失敗しました。");
      console.error(e);
    } finally {
      setSavingId(null);
    }
  }

  async function deleteRow(id: string) {
    if (!confirm("削除しますか？")) return;
    setError(null);
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/diagnosis/instructors/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`delete failed: ${res.status}`);
      setRows((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError("削除に失敗しました。");
      console.error(e);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">講師管理</h1>
          <p className="text-sm opacity-70">schoolId: {schoolId || "-"}</p>
        </div>
        <button
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-40"
          onClick={fetchRows}
          disabled={!schoolId || loading}
        >
          再読み込み
        </button>
      </div>

      {error && <div className="text-sm text-red-500">{error}</div>}

      {/* 新規追加 */}
      <div className="border rounded p-4 space-y-3">
        <div className="font-semibold">新規追加</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="name（表示名）"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="slug（URL用）"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            type="number"
            placeholder="sortOrder"
            value={newSortOrder}
            onChange={(e) => setNewSortOrder(Number(e.target.value))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newIsActive}
              onChange={(e) => setNewIsActive(e.target.checked)}
            />
            有効
          </label>
        </div>
        <button
          className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-40"
          onClick={addRow}
          disabled={!schoolId || !newName || !newSlug}
        >
          追加
        </button>
      </div>

      {/* 一覧 */}
      <div className="border rounded overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">name</th>
              <th className="text-left p-2">slug</th>
              <th className="text-left p-2">sortOrder</th>
              <th className="text-left p-2">isActive</th>
              <th className="text-left p-2">actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">
                  <input
                    className="border rounded px-2 py-1 w-full"
                    value={r.name}
                    onChange={(e) =>
                      setRows((p) =>
                        p.map((x) =>
                          x.id === r.id ? { ...x, name: e.target.value } : x
                        )
                      )
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    className="border rounded px-2 py-1 w-full"
                    value={r.slug}
                    onChange={(e) =>
                      setRows((p) =>
                        p.map((x) =>
                          x.id === r.id ? { ...x, slug: e.target.value } : x
                        )
                      )
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    className="border rounded px-2 py-1 w-28"
                    type="number"
                    value={r.sortOrder}
                    onChange={(e) =>
                      setRows((p) =>
                        p.map((x) =>
                          x.id === r.id
                            ? { ...x, sortOrder: Number(e.target.value) }
                            : x
                        )
                      )
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={r.isActive}
                    onChange={(e) =>
                      setRows((p) =>
                        p.map((x) =>
                          x.id === r.id
                            ? { ...x, isActive: e.target.checked }
                            : x
                        )
                      )
                    }
                  />
                </td>
                <td className="p-2 flex gap-2">
                  <button
                    className="px-2 py-1 rounded border disabled:opacity-40"
                    onClick={() => saveRow(r)}
                    disabled={savingId === r.id}
                  >
                    保存
                  </button>
                  <button
                    className="px-2 py-1 rounded border text-red-600 disabled:opacity-40"
                    onClick={() => deleteRow(r.id)}
                    disabled={savingId === r.id}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="p-3 opacity-60" colSpan={5}>
                  {loading ? "読み込み中..." : "データがありません"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
