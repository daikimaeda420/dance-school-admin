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
  const s = (input ?? "").trim().toLowerCase();
  if (!s) return "";
  return s
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const card =
  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm " +
  "dark:border-gray-800 dark:bg-gray-900";

const input =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 " +
  "dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

const monoInput = input + " font-mono";

const btnPrimary =
  "rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

const btnOutline =
  "rounded-full border border-gray-300 px-4 py-2 text-sm disabled:opacity-50";

const btnDanger =
  "rounded-full border border-red-300 px-3 py-1.5 text-xs text-red-600";

export default function GenreAdminClient({
  initialSchoolId,
}: {
  initialSchoolId: string;
}) {
  const [schoolId, setSchoolId] = useState(initialSchoolId);

  const [rows, setRows] = useState<GenreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 新規作成
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSortOrder, setNewSortOrder] = useState(1);
  const [newIsActive, setNewIsActive] = useState(true);

  const [editMap, setEditMap] = useState<Record<string, Partial<GenreRow>>>({});

  const canLoad = schoolId.trim().length > 0;

  /* ========= fetch ========= */
  const fetchList = async () => {
    if (!canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/diagnosis/genres?schoolId=${encodeURIComponent(schoolId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("ジャンルの取得に失敗しました");
      const data = (await res.json()) as GenreRow[];
      setRows(data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!schoolId.trim()) return;
    void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  /* ========= create ========= */
  const createGenre = async () => {
    if (!newId || !newLabel || !newSlug) {
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
          id: newId,
          schoolId,
          label: newLabel,
          slug: newSlug,
          sortOrder: newSortOrder,
          isActive: newIsActive,
        }),
      });
      if (!res.ok) throw new Error("作成に失敗しました");

      setNewId("");
      setNewLabel("");
      setNewSlug("");
      setNewSortOrder(1);
      setNewIsActive(true);
      await fetchList();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ========= update ========= */
  const saveEdit = async (id: string) => {
    const e = editMap[id];
    if (!e?.label || !e.slug) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnosis/genres", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, schoolId, ...e }),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      setEditMap((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
      await fetchList();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const hintId = useMemo(
    () => `genre_${slugifyJa(newLabel) || "new"}`,
    [newLabel]
  );
  const hintSlug = useMemo(() => slugifyJa(newLabel), [newLabel]);

  /* ========= UI ========= */
  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <h1 className="text-lg font-bold">診断編集：ジャンル管理</h1>

      {/* schoolId */}
      <div className={card}>
        <div className="text-xs mb-1">schoolId</div>
        <input
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          className={input}
        />
      </div>

      {/* create */}
      <div className={card}>
        <div className="font-semibold mb-2">新規追加</div>
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
        <div className="text-xs mt-1">
          id例：{hintId} / slug例：{hintSlug}
        </div>
        <input
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          className={monoInput}
        />
        <input
          value={newSlug}
          onChange={(e) => setNewSlug(e.target.value)}
          className={monoInput}
        />
        <button onClick={createGenre} disabled={saving} className={btnPrimary}>
          追加
        </button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* list */}
      <div className={card}>
        {rows.map((r) => (
          <div key={r.id} className="flex gap-2 items-center mb-2">
            <input
              value={(editMap[r.id]?.label ?? r.label) || ""}
              onChange={(e) =>
                setEditMap((p) => ({
                  ...p,
                  [r.id]: { ...(p[r.id] ?? r), label: e.target.value },
                }))
              }
              className={input}
            />
            <input
              value={(editMap[r.id]?.slug ?? r.slug) || ""}
              onChange={(e) =>
                setEditMap((p) => ({
                  ...p,
                  [r.id]: { ...(p[r.id] ?? r), slug: e.target.value },
                }))
              }
              className={monoInput}
            />
            <button
              onClick={() => saveEdit(r.id)}
              disabled={saving}
              className={btnOutline}
            >
              保存
            </button>
          </div>
        ))}
        {!rows.length && !loading && (
          <div className="text-sm text-gray-500">ジャンルがありません</div>
        )}
      </div>
    </div>
  );
}
