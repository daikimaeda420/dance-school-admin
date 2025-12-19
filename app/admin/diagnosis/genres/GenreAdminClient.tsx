// app/admin/diagnosis/genres/GenreAdminClient.tsx
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

export default function DiagnosisGenresPage({
  initialSchoolId,
}: {
  initialSchoolId: string;
}) {
  const [schoolId, setSchoolId] = useState(initialSchoolId);

  const [rows, setRows] = useState<GenreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSortOrder, setNewSortOrder] = useState<number>(1);
  const [newIsActive, setNewIsActive] = useState(true);

  const [editMap, setEditMap] = useState<Record<string, Partial<GenreRow>>>({});

  const canLoad = schoolId.trim().length > 0;

  const fetchList = async () => {
    if (!canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/diagnosis/genres?schoolId=${encodeURIComponent(schoolId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("DiagnosisGenre の取得に失敗しました");
      const data = (await res.json()) as any[];

      setRows(
        data
          .map((d) => ({
            id: String(d.id),
            schoolId: String(d.schoolId ?? schoolId),
            label: String(d.label ?? ""),
            slug: String(d.slug ?? ""),
            sortOrder: Number(d.sortOrder ?? 1),
            isActive: Boolean(d.isActive ?? true),
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
    } catch (e: any) {
      setError(e?.message ?? "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!schoolId.trim()) return;
    void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const hintId = useMemo(() => {
    const base = slugifyJa(newLabel) || "genre";
    return `genre_${base}`;
  }, [newLabel]);

  const hintSlug = useMemo(() => slugifyJa(newLabel), [newLabel]);

  /* ↓↓↓ 以降の JSX は **一切変更なし** ↓↓↓ */

  return (
    <div className="mx-auto w-full max-w-5xl p-6 text-gray-900 dark:text-gray-100">
      {/* 既存UIそのまま */}
      {/* schoolId input / create / list / buttons */}
      {/* （あなたの貼ってくれた JSX 部分は完全にそのままでOK） */}
    </div>
  );
}
