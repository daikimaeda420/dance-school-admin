// app/admin/diagnosis/courses/CourseAdminClient.tsx
"use client";

import { useEffect, useState } from "react";

type Course = {
  id: string;
  schoolId: string;
  label: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
};

type Props = {
  schoolId: string;
};

export default function CourseAdminClient({ schoolId }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 新規追加
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSortOrder, setNewSortOrder] = useState<number>(0);
  const [newIsActive, setNewIsActive] = useState(true);

  const disabled = !schoolId;

  const fetchCourses = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/diagnosis/courses?schoolId=${encodeURIComponent(schoolId)}`
      );
      if (!res.ok) throw new Error("コース一覧の取得に失敗しました。");
      const data = (await res.json()) as Course[];
      setCourses(data);
    } catch (e) {
      console.error(e);
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const handleCreate = async () => {
    if (!schoolId) return;
    if (!newLabel || !newSlug) {
      setError("コース名とスラッグは必須です。");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/diagnosis/courses", {
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
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "作成に失敗しました。");
      }

      setNewLabel("");
      setNewSlug("");
      setNewSortOrder(0);
      setNewIsActive(true);
      await fetchCourses();
    } catch (e: any) {
      setError(e?.message ?? "通信エラーが発生しました。");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateField = async (
    id: string,
    field: keyof Pick<Course, "label" | "slug" | "sortOrder" | "isActive">,
    value: string | number | boolean
  ) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/diagnosis/courses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "更新に失敗しました。");
      }
      await fetchCourses();
    } catch (e: any) {
      setError(e?.message ?? "通信エラーが発生しました。");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("このコースを削除しますか？")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/diagnosis/courses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "削除に失敗しました。");
      }
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      setError(e?.message ?? "通信エラーが発生しました。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 新規追加 */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">新しいコースを追加</h2>
        <div className="mb-2 grid gap-3 md:grid-cols-4">
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="コース名（例：初心者）"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            disabled={disabled || saving}
          />
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="slug（例：beginner）"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            disabled={disabled || saving}
          />
          <input
            type="number"
            className="rounded border px-2 py-1 text-sm"
            placeholder="sortOrder"
            value={newSortOrder}
            onChange={(e) => setNewSortOrder(Number(e.target.value) || 0)}
            disabled={disabled || saving}
          />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={newIsActive}
              onChange={(e) => setNewIsActive(e.target.checked)}
              disabled={disabled || saving}
            />
            有効
          </label>
        </div>
        <button
          onClick={handleCreate}
          disabled={disabled || saving}
          className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {saving ? "保存中..." : "コースを追加"}
        </button>
      </div>

      {/* 一覧 */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">コース一覧</h2>
          {loading && (
            <span className="text-xs text-gray-400">読み込み中...</span>
          )}
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
            {error}
          </div>
        )}

        {courses.length === 0 ? (
          <p className="text-xs text-gray-500">
            登録されているコースはありません。
          </p>
        ) : (
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead>
              <tr className="border-b bg-gray-50 text-[11px] text-gray-600">
                <th className="px-2 py-1">コース名</th>
                <th className="px-2 py-1">slug</th>
                <th className="px-2 py-1">sort</th>
                <th className="px-2 py-1">有効</th>
                <th className="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b last:border-none">
                  <td className="px-2 py-1">
                    <input
                      className="w-full rounded border px-1 py-0.5"
                      value={c.label}
                      onChange={(e) =>
                        setCourses((prev) =>
                          prev.map((p) =>
                            p.id === c.id ? { ...p, label: e.target.value } : p
                          )
                        )
                      }
                      onBlur={(e) =>
                        handleUpdateField(c.id, "label", e.target.value)
                      }
                      disabled={saving}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="w-full rounded border px-1 py-0.5"
                      value={c.slug}
                      onChange={(e) =>
                        setCourses((prev) =>
                          prev.map((p) =>
                            p.id === c.id ? { ...p, slug: e.target.value } : p
                          )
                        )
                      }
                      onBlur={(e) =>
                        handleUpdateField(c.id, "slug", e.target.value)
                      }
                      disabled={saving}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      className="w-20 rounded border px-1 py-0.5"
                      value={c.sortOrder}
                      onChange={(e) =>
                        setCourses((prev) =>
                          prev.map((p) =>
                            p.id === c.id
                              ? { ...p, sortOrder: Number(e.target.value) || 0 }
                              : p
                          )
                        )
                      }
                      onBlur={(e) =>
                        handleUpdateField(
                          c.id,
                          "sortOrder",
                          Number(e.target.value) || 0
                        )
                      }
                      disabled={saving}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="checkbox"
                      checked={c.isActive}
                      onChange={(e) =>
                        handleUpdateField(c.id, "isActive", e.target.checked)
                      }
                      disabled={saving}
                    />
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-[11px] text-red-600 underline"
                      disabled={saving}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
