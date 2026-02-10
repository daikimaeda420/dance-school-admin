// app/(app)/admin/diagnosis/instructors/InstructorAdminClient.tsx
"use client";

import { QUESTIONS } from "@/lib/diagnosis/config";
import { useEffect, useMemo, useState } from "react";

type Props = { initialSchoolId?: string };

type OptionRow = {
  id: string; // 画面で使うID（beginner / ikoma / genre_kpop）
  dbId?: string; // ✅ 追加（cm...）
  label: string;
  slug?: string;
  answerTag?: string | null;
  isActive?: boolean;
};

type InstructorRow = {
  id: string;
  schoolId: string;
  label: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  photoMime?: string | null;

  charmTags?: string | null;
  introduction?: string | null;

  courses?: OptionRow[];
  campuses?: OptionRow[];
  genres?: OptionRow[];

  courseIds?: string[];
  campusIds?: string[];
  genreIds?: string[];
  concernIds?: string[];
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
const thumb =
  "h-12 w-12 rounded-xl border border-gray-200 object-cover dark:border-gray-800";

const EMPTY_IMG =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function uniqStrings(xs: any[]) {
  return Array.from(
    new Set((xs ?? []).map((s) => String(s ?? "").trim()).filter(Boolean)),
  );
}

function safeArray(v: any): string[] {
  if (Array.isArray(v)) return uniqStrings(v);
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const arr = JSON.parse(s);
        return Array.isArray(arr) ? uniqStrings(arr) : [];
      } catch {}
    }
    return uniqStrings(s.split(","));
  }
  return [];
}

function joinLabels(opts?: OptionRow[]) {
  return (opts ?? [])
    .map((o) => o.label)
    .filter(Boolean)
    .join(" / ");
}

function labelsBySelectedIds(ids: string[], options: OptionRow[]) {
  const cleaned = uniqStrings(ids ?? []);
  if (cleaned.length === 0) return [];

  // options未ロードなら、とりあえずIDを表示（空にしない）
  if (!options || options.length === 0) return cleaned;

  const map = new Map<string, string>();
  for (const o of options) {
    const id = String(o.id ?? "").trim();
    if (!id) continue;
    map.set(id, String(o.label ?? "").trim());
  }

  return cleaned
    .map((id) => map.get(id) ?? id) // 見つからない時もIDで表示
    .map((s) => String(s ?? "").trim())
    .filter(Boolean);
}

/**
 * ✅ id/slug/label が混在していても options の id に解決して返す
 */
function resolveToOptionIds(vals: string[], options: OptionRow[]) {
  const cleaned = uniqStrings(vals ?? []);

  // ✅ options 未ロード時は変換しない
  if (!options || options.length === 0) {
    return cleaned;
  }

  const map = new Map<string, string>();
  for (const o of options) {
    const id = String(o.id ?? "").trim();
    const dbId = String(o.dbId ?? "").trim();
    const slug = String(o.slug ?? "").trim();
    const label = String(o.label ?? "").trim();
    const answerTag = String(o.answerTag ?? "").trim();
    if (!id) continue;
    map.set(id, id);
    if (dbId) map.set(dbId, id);
    if (slug) map.set(slug, id);
    if (label) map.set(label, id);
    if (answerTag) map.set(answerTag, id);
  }

  return Array.from(
    new Set(cleaned.map((v) => map.get(v) ?? "").filter(Boolean)),
  );
}

/**
 * ✅ optionsに存在するものだけ残す（未存在IDの除去）
 * - options未ロード時は絶対に削らない
 */
function normalizeIdsByOptions(ids: string[], options: { id: string }[]) {
  const cleaned = Array.from(
    new Set(
      (ids ?? [])
        .map(String)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );

  if (!options || options.length === 0) {
    return cleaned;
  }

  const allow = new Set(options.map((o) => String(o.id ?? "").trim()));
  return cleaned.filter((id) => allow.has(id));
}

function CheckboxList({
  options,
  selected,
  onChange,
  columns = 2,
}: {
  options: OptionRow[];
  selected: string[];
  onChange: (next: string[]) => void;
  columns?: 1 | 2 | 3;
}) {
  const selectedNorm = useMemo(() => uniqStrings(selected ?? []), [selected]);
  const set = useMemo(() => new Set(selectedNorm), [selectedNorm]);

  const gridCols =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-3"
        : "grid-cols-2";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
      <div className={`grid gap-2 ${gridCols}`}>
        {options.map((o) => {
          const oid = String(o.id ?? "").trim();
          const checked = set.has(oid);

          return (
            <button
              type="button"
              key={oid}
              onClick={() => {
                const next = checked
                  ? selectedNorm.filter((x) => x !== oid)
                  : uniqStrings([...selectedNorm, oid]);
                onChange(next);
              }}
              className="flex items-center gap-2 text-left text-xs text-gray-800 dark:text-gray-200"
              title={o.label}
            >
              <span
                className={[
                  "grid h-4 w-4 place-items-center rounded border",
                  checked
                    ? "border-blue-500 bg-blue-600"
                    : "border-gray-300 bg-transparent dark:border-gray-700",
                ].join(" ")}
                aria-hidden
              >
                {checked ? (
                  <span className="h-2 w-2 rounded-[2px] bg-white" />
                ) : null}
              </span>

              <span className="truncate">{o.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 text-[10px] text-gray-400">
        selected: {selectedNorm.length}
      </div>
    </div>
  );
}

function TagPills({
  labels,
  empty = "—",
}: {
  labels: string[];
  empty?: string;
}) {
  const items = (labels ?? []).map((s) => String(s).trim()).filter(Boolean);

  if (items.length === 0) {
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">{empty}</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span
          key={t}
          className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

export default function InstructorAdminClient({ initialSchoolId }: Props) {
  const [schoolId, setSchoolId] = useState(initialSchoolId ?? "");

  const [rows, setRows] = useState<InstructorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [courses, setCourses] = useState<OptionRow[]>([]);
  const [campuses, setCampuses] = useState<OptionRow[]>([]);
  const [genres, setGenres] = useState<OptionRow[]>([]);
  const [concerns, setConcerns] = useState<OptionRow[]>([]);

  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [newFile, setNewFile] = useState<File | null>(null);

  const [newCourseIds, setNewCourseIds] = useState<string[]>([]);
  const [newCampusIds, setNewCampusIds] = useState<string[]>([]);
  const [newGenreIds, setNewGenreIds] = useState<string[]>([]);
  const [newConcernIds, setNewConcernIds] = useState<string[]>([]);

  const [newCharmTags, setNewCharmTags] = useState("");
  const [newIntroduction, setNewIntroduction] = useState("");

  const [editMap, setEditMap] = useState<
    Record<string, Partial<InstructorRow>>
  >({});
  const [editFileMap, setEditFileMap] = useState<Record<string, File | null>>(
    {},
  );
  const [clearPhotoMap, setClearPhotoMap] = useState<Record<string, boolean>>(
    {},
  );
  const [editPreviewMap, setEditPreviewMap] = useState<Record<string, string>>(
    {},
  );

  const canLoad = schoolId.trim().length > 0;

  const photoUrl = (id: string) =>
    `/api/diagnosis/instructors/photo?id=${encodeURIComponent(
      id,
    )}&schoolId=${encodeURIComponent(schoolId)}`;

  type OptionKind = "course" | "campus" | "genre";

  const normalizeOptions = (kind: OptionKind, x: any): OptionRow[] => {
    const arr = Array.isArray(x?.items) ? x.items : Array.isArray(x) ? x : [];

    return arr
      .map((d: any) => {
        const dbId = String(d.dbId ?? d.id ?? "").trim();
        const slug = d.slug ? String(d.slug).trim() : undefined;
        const label = String(d.label ?? d.name ?? d.title ?? "").trim();
        const answerTag = d.answerTag ? String(d.answerTag).trim() : null;

        // ✅ UIで使う id を kind ごとに統一
        // course/campus: slug（beginner / ikoma）
        // genre(Q4): answerTag（Genre_KPOP）
        const uiId =
          kind === "genre" ? answerTag || slug || dbId : slug || dbId;

        return {
          id: uiId, // ✅ UIキー
          dbId: dbId || undefined, // DB実ID（cm...）
          label,
          slug,
          answerTag,
          isActive: typeof d.isActive === "boolean" ? d.isActive : undefined,
        } as OptionRow;
      })
      .filter((o) => o.id && o.label);
  };

  const fetchOptions = async () => {
    if (!canLoad) return;

    try {
      const [cRes, pRes] = await Promise.all([
        fetch(
          `/api/diagnosis/courses?schoolId=${encodeURIComponent(schoolId)}`,
        ),
        fetch(
          `/api/diagnosis/campuses?schoolId=${encodeURIComponent(schoolId)}`,
        ),
      ]);

      const cJson = cRes.ok ? await cRes.json().catch(() => []) : [];
      const pJson = pRes.ok ? await pRes.json().catch(() => []) : [];

      const c = normalizeOptions("course", cJson);
      const p = normalizeOptions("campus", pJson);

      // Q4
      const q4 = QUESTIONS.find((q) => q.id === "Q4");
      const g: OptionRow[] = (q4?.options ?? []).map((o: any) => ({
        id: String(o.id),
        label: String(o.label),
        answerTag: String(o.id),
        isActive: true,
      }));

      // ✅ 講師紐づけは Q5 を使用（保存キー q6OptionIds は互換維持）
      const q5 = QUESTIONS.find((q) => q.id === "Q5");
      const concerns: OptionRow[] = (q5?.options ?? []).map((o: any) => ({
        id: String(o.id),
        label: String(o.label),
        isActive: true,
      }));

      setCourses(c);
      setCampuses(p);
      setGenres(g);
      setConcerns(concerns);
    } catch {
      // noop
    }
  };

  const fetchList = async () => {
    if (!canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/diagnosis/instructors?schoolId=${encodeURIComponent(schoolId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("DiagnosisInstructor の取得に失敗しました");
      const data = (await res.json()) as any[];

      const normalizedRows: InstructorRow[] = data.map((d) => ({
        id: String(d.id),
        schoolId: String(d.schoolId ?? schoolId),
        label: String(d.label ?? ""),
        slug: String(d.slug ?? ""),
        sortOrder: Number(d.sortOrder ?? 1),
        isActive: Boolean(d.isActive ?? true),
        photoMime: typeof d.photoMime === "string" ? d.photoMime : null,

        charmTags: typeof d.charmTags === "string" ? d.charmTags : null,
        introduction:
          typeof d.introduction === "string" ? d.introduction : null,

        courses: Array.isArray(d.courses) ? d.courses : [],
        campuses: Array.isArray(d.campuses) ? d.campuses : [],
        genres: Array.isArray(d.genres) ? d.genres : [],

        courseIds: safeArray(d.courseIds),
        campusIds: safeArray(d.campusIds),
        genreIds: safeArray(d.genreIds),
        concernIds: safeArray(d.q6OptionIds ?? d.concernIds),
      }));

      setRows(
        normalizedRows.sort((a, b) =>
          (a.label ?? "").localeCompare(b.label ?? "", "ja"),
        ),
      );
    } catch (e: any) {
      setError(e?.message ?? "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canLoad) return;

    // ✅ options（courses/campuses/genres）を先に読み込んでから list を読む
    (async () => {
      try {
        await fetchOptions();
        await fetchList();
      } catch {
        // noop
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const previewForNew = useMemo(() => {
    if (!newFile) return "";
    return URL.createObjectURL(newFile);
  }, [newFile]);

  useEffect(() => {
    return () => {
      if (previewForNew) URL.revokeObjectURL(previewForNew);
    };
  }, [previewForNew]);

  useEffect(() => {
    return () => {
      Object.values(editPreviewMap).forEach((u) => {
        try {
          if (u) URL.revokeObjectURL(u);
        } catch {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createInstructor = async () => {
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
      const fd = new FormData();
      fd.append("id", id);
      fd.append("schoolId", schoolId);
      fd.append("label", label);
      fd.append("slug", slug);
      fd.append("sortOrder", "1");
      fd.append("isActive", String(newIsActive));
      if (newFile) fd.append("file", newFile);

      const sendCourseIds = normalizeIdsByOptions(
        resolveToOptionIds(uniqStrings(newCourseIds), courses),
        courses,
      );
      const sendCampusIds = normalizeIdsByOptions(
        resolveToOptionIds(uniqStrings(newCampusIds), campuses),
        campuses,
      );
      const sendGenreIds = normalizeIdsByOptions(
        resolveToOptionIds(uniqStrings(newGenreIds), genres),
        genres,
      );

      const sendConcernIds = normalizeIdsByOptions(
        resolveToOptionIds(uniqStrings(newConcernIds), concerns),
        concerns,
      );

      fd.append("courseIds", JSON.stringify(sendCourseIds));
      fd.append("campusIds", JSON.stringify(sendCampusIds));
      fd.append("genreIds", JSON.stringify(sendGenreIds));
      fd.append("q6OptionIds", JSON.stringify(sendConcernIds));

      fd.append("charmTags", newCharmTags);
      fd.append("introduction", newIntroduction);

      const res = await fetch("/api/diagnosis/instructors", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "作成に失敗しました");
      }

      setNewId("");
      setNewLabel("");
      setNewSlug("");
      setNewIsActive(true);
      setNewFile(null);
      setNewCourseIds([]);
      setNewCampusIds([]);
      setNewConcernIds([]);
      setNewGenreIds([]);
      setNewCharmTags("");
      setNewIntroduction("");

      await fetchList();
    } catch (e: any) {
      setError(e?.message ?? "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r: InstructorRow) => {
    const rawCourseIds =
      safeArray(r.courseIds).length > 0
        ? safeArray(r.courseIds)
        : uniqStrings((r.courses ?? []).map((c) => c.id));

    const rawCampusIds =
      safeArray(r.campusIds).length > 0
        ? safeArray(r.campusIds)
        : uniqStrings((r.campuses ?? []).map((c) => c.id));

    const rawGenreIds =
      safeArray(r.genreIds).length > 0
        ? safeArray(r.genreIds)
        : uniqStrings((r.genres ?? []).map((g) => g.id));

    const rawConcernIds =
      safeArray(r.concernIds).length > 0
        ? safeArray(r.concernIds)
        : safeArray((r as any).q6OptionIds);

    const seedConcernIds = normalizeIdsByOptions(
      resolveToOptionIds(rawConcernIds, concerns),
      concerns,
    );

    const seedCourseIds = normalizeIdsByOptions(
      resolveToOptionIds(rawCourseIds, courses),
      courses,
    );
    const seedCampusIds = normalizeIdsByOptions(
      resolveToOptionIds(rawCampusIds, campuses),
      campuses,
    );
    const seedGenreIds = normalizeIdsByOptions(
      resolveToOptionIds(rawGenreIds, genres),
      genres,
    );

    setEditMap((prev) => ({
      ...prev,
      [r.id]: {
        id: r.id,
        schoolId: r.schoolId,
        label: r.label ?? "",
        slug: r.slug ?? "",
        sortOrder: r.sortOrder ?? 1,
        isActive: Boolean(r.isActive),

        courseIds: seedCourseIds,
        campusIds: seedCampusIds,
        genreIds: seedGenreIds,
        concernIds: seedConcernIds,

        charmTags: String(r.charmTags ?? ""),
        introduction: String(r.introduction ?? ""),
      },
    }));
    setEditFileMap((prev) => ({ ...prev, [r.id]: null }));
    setClearPhotoMap((prev) => ({ ...prev, [r.id]: false }));
    setEditPreviewMap((prev) => ({ ...prev, [r.id]: "" }));
  };

  const cancelEdit = (id: string) => {
    setEditPreviewMap((prev) => {
      const u = prev[id];
      if (u) {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });

    setEditMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setEditFileMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setClearPhotoMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateEditField = (id: string, patch: Partial<InstructorRow>) => {
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
      const fd = new FormData();
      fd.append("id", id);
      fd.append("schoolId", schoolId);
      fd.append("label", String(e.label));
      fd.append("slug", String(e.slug));
      fd.append("sortOrder", String((e as any).sortOrder ?? 1));
      fd.append("isActive", String(e.isActive ?? true));
      fd.append("clearPhoto", String(clearPhotoMap[id] ?? false));

      const file = editFileMap[id];
      if (file) fd.append("file", file);

      // ✅ コース/校舎/ジャンル：編集値(e.xxx)を送る
      const sendCourseIds = normalizeIdsByOptions(
        resolveToOptionIds(uniqStrings(e.courseIds ?? []), courses),
        courses,
      );
      const sendCampusIds = normalizeIdsByOptions(
        resolveToOptionIds(uniqStrings(e.campusIds ?? []), campuses),
        campuses,
      );
      const sendGenreIds = normalizeIdsByOptions(
        resolveToOptionIds(uniqStrings(e.genreIds ?? []), genres),
        genres,
      );

      // ✅ 講師紐づけ（UIはQ5）：e.concernIds が無い/空のときのフォールバックも見る
      const rawConcernIds = uniqStrings(
        (e.concernIds && e.concernIds.length > 0
          ? e.concernIds
          : ((e as any).q6OptionIds ?? [])) as any[],
      );

      const sendConcernIds = normalizeIdsByOptions(
        resolveToOptionIds(rawConcernIds, concerns),
        concerns,
      );

      // ✅ 送信
      fd.append("courseIds", JSON.stringify(sendCourseIds));
      fd.append("campusIds", JSON.stringify(sendCampusIds));
      fd.append("genreIds", JSON.stringify(sendGenreIds));
      fd.append("q6OptionIds", JSON.stringify(sendConcernIds));

      fd.append("charmTags", String((e as any).charmTags ?? ""));
      fd.append("introduction", String((e as any).introduction ?? ""));

      const res = await fetch("/api/diagnosis/instructors", {
        method: "PUT",
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "更新に失敗しました");
      }

      cancelEdit(id);
      await fetchList();
    } catch (err: any) {
      setError(err?.message ?? "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: InstructorRow, nextActive: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("id", r.id);
      fd.append("schoolId", schoolId);
      fd.append("label", String(r.label ?? ""));
      fd.append("slug", String(r.slug ?? ""));
      fd.append("sortOrder", String(r.sortOrder ?? 1));
      fd.append("isActive", String(nextActive));
      fd.append("clearPhoto", "false");

      const keepCourseRaw =
        safeArray(r.courseIds).length > 0
          ? safeArray(r.courseIds)
          : uniqStrings((r.courses ?? []).map((c) => c.id));
      const keepCampusRaw =
        safeArray(r.campusIds).length > 0
          ? safeArray(r.campusIds)
          : uniqStrings((r.campuses ?? []).map((c) => c.id));
      const keepGenreRaw =
        safeArray(r.genreIds).length > 0
          ? safeArray(r.genreIds)
          : uniqStrings((r.genres ?? []).map((g) => g.id));

      const keepCourseIds = normalizeIdsByOptions(
        resolveToOptionIds(keepCourseRaw, courses),
        courses,
      );
      const keepCampusIds = normalizeIdsByOptions(
        resolveToOptionIds(keepCampusRaw, campuses),
        campuses,
      );
      const keepGenreIds = normalizeIdsByOptions(
        resolveToOptionIds(keepGenreRaw, genres),
        genres,
      );

      const keepConcernRaw =
        safeArray((r as any).q6OptionIds).length > 0
          ? safeArray((r as any).q6OptionIds)
          : safeArray((r as any).concernIds);

      const keepConcernIds = normalizeIdsByOptions(
        resolveToOptionIds(keepConcernRaw, concerns),
        concerns,
      );

      fd.append("courseIds", JSON.stringify(keepCourseIds));
      fd.append("campusIds", JSON.stringify(keepCampusIds));
      fd.append("genreIds", JSON.stringify(keepGenreIds));
      fd.append("q6OptionIds", JSON.stringify(keepConcernIds));

      fd.append("charmTags", String(r.charmTags ?? ""));
      fd.append("introduction", String(r.introduction ?? ""));

      const res = await fetch("/api/diagnosis/instructors", {
        method: "PUT",
        body: fd,
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

  const hintId = useMemo(
    () => `instructor_${slugifyJa(newLabel) || "new"}`,
    [newLabel],
  );
  const hintSlug = useMemo(() => slugifyJa(newLabel), [newLabel]);

  return (
    <div className="mx-auto w-full p-6 text-gray-900 dark:text-gray-100">
      <div className="mb-4">
        <div className="text-base font-bold">診断編集：講師管理</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          画像は管理画面からアップロードしてDBに保存します（上限はAPI内で制御）。
          <span className="ml-2">
            推奨画像サイズ：<span className="font-semibold">500×500</span>
          </span>
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
                if (!newId) setNewId(`instructor_${slugifyJa(v) || "new"}`);
              }}
              className={input}
              placeholder="例：田中先生"
            />
            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              id例：<code className={codePill}>{hintId}</code> / slug例：{" "}
              <code className={codePill}>{hintSlug || "tanaka"}</code>
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
              placeholder="例：instructor_tanaka"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              slug（診断回答で送る値）
            </div>
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className={monoInput}
              placeholder="例：tanaka"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              画像（DB保存）
              <span className="ml-2 text-[11px] font-normal text-gray-500 dark:text-gray-400">
                推奨：500×500
              </span>
            </div>
            <div className="flex items-center gap-3">
              <img src={previewForNew || EMPTY_IMG} className={thumb} alt="" />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                className={input}
              />
            </div>
          </div>

          {/* プロフィール */}
          <div className="md:col-span-2">
            <div className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
              プロフィール
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] text-gray-600 dark:text-gray-300">
                  チャームポイントタグ（改行で追加）
                </div>
                <textarea
                  value={newCharmTags}
                  onChange={(e) => setNewCharmTags(e.target.value)}
                  rows={4}
                  className={input}
                />
              </div>

              <div>
                <div className="mb-1 text-[11px] text-gray-600 dark:text-gray-300">
                  自己紹介文
                </div>
                <textarea
                  value={newIntroduction}
                  onChange={(e) => setNewIntroduction(e.target.value)}
                  rows={4}
                  className={input}
                />
              </div>
            </div>
          </div>

          {/* 対応コース/校舎/ジャンル */}
          <div className="md:col-span-2">
            <div className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
              対応（複数選択）
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                  対応コース（チェック）
                </div>
                <CheckboxList
                  options={courses}
                  selected={newCourseIds}
                  onChange={(next) =>
                    setNewCourseIds(normalizeIdsByOptions(next, courses))
                  }
                  columns={2}
                />
              </div>

              <div>
                <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                  対応校舎（チェック）
                </div>
                <CheckboxList
                  options={campuses}
                  selected={newCampusIds}
                  onChange={(next) =>
                    setNewCampusIds(normalizeIdsByOptions(next, campuses))
                  }
                  columns={2}
                />
              </div>

              <div>
                <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                  好みの音楽・雰囲気（チェック）
                </div>
                <CheckboxList
                  options={genres}
                  selected={newGenreIds}
                  onChange={(next) =>
                    setNewGenreIds(normalizeIdsByOptions(next, genres))
                  }
                  columns={1}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                理想の先生（Q5）
              </div>
              <CheckboxList
                options={concerns}
                selected={newConcernIds}
                onChange={(next) =>
                  setNewConcernIds(normalizeIdsByOptions(next, concerns))
                }
                columns={1}
              />
            </div>

            <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              ✅ コース/校舎/ジャンルは複数選択できます。
            </div>
          </div>

          <div className="flex items-end gap-2 md:col-span-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={newIsActive}
                onChange={(e) => setNewIsActive(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-700"
              />
              active
            </label>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={createInstructor}
            disabled={saving}
            className={btnPrimary}
          >
            {saving ? "保存中..." : "追加する"}
          </button>
          <button
            type="button"
            onClick={() => {
              void fetchOptions();
              void fetchList();
            }}
            disabled={loading || !canLoad}
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
            まだ講師がありません。上のフォームから追加してください。
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const editing = editMap[r.id] !== undefined;
              const e = editMap[r.id];
              const current = editing ? e : r;

              const localPreview = editPreviewMap[r.id] || "";
              const hasDbPhoto = Boolean(r.photoMime);

              // ✅ コース：IDsが無い場合は courses 配列から拾う（後方互換）
              const rawCourseIds = editing
                ? uniqStrings((e?.courseIds ?? []) as any[])
                : safeArray(r.courseIds).length > 0
                  ? safeArray(r.courseIds)
                  : uniqStrings(
                      (r.courses ?? []).map((c) => (c as any).dbId ?? c.id),
                    );

              // ✅ 校舎：IDsが無い場合は campuses 配列から拾う（ここが肝）
              const rawCampusIds = editing
                ? uniqStrings((e?.campusIds ?? []) as any[])
                : safeArray(r.campusIds).length > 0
                  ? safeArray(r.campusIds)
                  : uniqStrings(
                      (r.campuses ?? []).map((c) => (c as any).dbId ?? c.id),
                    );

              // ✅ ジャンル：IDsが無い場合は genres 配列から拾う（後方互換）
              const rawGenreIds = editing
                ? uniqStrings((e?.genreIds ?? []) as any[])
                : safeArray(r.genreIds).length > 0
                  ? safeArray(r.genreIds)
                  : uniqStrings(
                      (r.genres ?? []).map((g) => (g as any).dbId ?? g.id),
                    );

              const selectedCourseIds = normalizeIdsByOptions(
                resolveToOptionIds(rawCourseIds, courses),
                courses,
              );

              const selectedCampusIds = normalizeIdsByOptions(
                resolveToOptionIds(rawCampusIds, campuses),
                campuses,
              );

              const selectedGenreIds = normalizeIdsByOptions(
                resolveToOptionIds(rawGenreIds, genres),
                genres,
              );

              const selectedConcernIds = normalizeIdsByOptions(
                resolveToOptionIds(
                  editing
                    ? uniqStrings((e?.concernIds ?? []) as any[])
                    : safeArray(
                        (r as any).concernIds ?? (r as any).q6OptionIds,
                      ),
                  concerns,
                ),
                concerns,
              );

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
                            value={String(current?.label ?? "")}
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
                              value={String(current?.slug ?? "")}
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

                        <div>
                          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                            画像
                            <span className="ml-2 text-[11px] font-normal text-gray-500 dark:text-gray-400">
                              推奨：500×500
                            </span>
                          </div>

                          <div className="mt-1 flex items-center gap-3">
                            <img
                              src={
                                localPreview ||
                                (hasDbPhoto ? photoUrl(r.id) : EMPTY_IMG)
                              }
                              className={thumb}
                              alt=""
                            />

                            {editing ? (
                              <div className="flex w-full flex-col gap-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(ev) => {
                                    const f = ev.target.files?.[0] ?? null;

                                    setEditPreviewMap((p) => {
                                      const prevUrl = p[r.id];
                                      if (prevUrl) {
                                        try {
                                          URL.revokeObjectURL(prevUrl);
                                        } catch {}
                                      }
                                      const next = { ...p };
                                      next[r.id] = f
                                        ? URL.createObjectURL(f)
                                        : "";
                                      return next;
                                    });

                                    setEditFileMap((p) => ({
                                      ...p,
                                      [r.id]: f,
                                    }));
                                    if (f)
                                      setClearPhotoMap((p) => ({
                                        ...p,
                                        [r.id]: false,
                                      }));
                                  }}
                                  className={input}
                                />

                                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(
                                      clearPhotoMap[r.id] ?? false,
                                    )}
                                    onChange={(ev) => {
                                      const checked = ev.target.checked;
                                      setClearPhotoMap((p) => ({
                                        ...p,
                                        [r.id]: checked,
                                      }));

                                      if (checked) {
                                        setEditFileMap((p) => ({
                                          ...p,
                                          [r.id]: null,
                                        }));
                                        setEditPreviewMap((p) => {
                                          const prevUrl = p[r.id];
                                          if (prevUrl) {
                                            try {
                                              URL.revokeObjectURL(prevUrl);
                                            } catch {}
                                          }
                                          return { ...p, [r.id]: "" };
                                        });
                                      }
                                    }}
                                  />
                                  画像を削除（DBからnullにする）
                                </label>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {hasDbPhoto ? "DB保存済み" : "未設定"}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 対応コース/校舎/ジャンル */}
                        <div className="md:col-span-3">
                          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                            紐づけ（コース / 校舎 / ジャンル / 理想の先生）
                          </div>

                          {editing ? (
                            <div className="mt-2 grid gap-2 md:grid-cols-3">
                              <div>
                                <div className="mb-1 text-[11px] text-gray-600 dark:text-gray-300">
                                  コース（チェック）
                                </div>
                                <CheckboxList
                                  options={courses}
                                  selected={selectedCourseIds}
                                  onChange={(next) =>
                                    updateEditField(r.id, {
                                      courseIds: normalizeIdsByOptions(
                                        next,
                                        courses,
                                      ),
                                    })
                                  }
                                  columns={2}
                                />
                              </div>

                              <div>
                                <div className="mb-1 text-[11px] text-gray-600 dark:text-gray-300">
                                  校舎（チェック）
                                </div>
                                <CheckboxList
                                  options={campuses}
                                  selected={selectedCampusIds}
                                  onChange={(next) =>
                                    updateEditField(r.id, {
                                      campusIds: normalizeIdsByOptions(
                                        next,
                                        campuses,
                                      ),
                                    })
                                  }
                                  columns={2}
                                />
                              </div>

                              <div>
                                <div className="mb-1 text-[11px] text-gray-600 dark:text-gray-300">
                                  好みの音楽・雰囲気（チェック）
                                </div>
                                <CheckboxList
                                  options={genres}
                                  selected={selectedGenreIds}
                                  onChange={(next) =>
                                    updateEditField(r.id, {
                                      genreIds: normalizeIdsByOptions(
                                        next,
                                        genres,
                                      ),
                                    })
                                  }
                                  columns={1}
                                />
                              </div>

                              <div>
                                <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                                  理想の先生（Q5）
                                </div>
                                <CheckboxList
                                  options={concerns}
                                  selected={selectedConcernIds}
                                  onChange={(next) =>
                                    updateEditField(r.id, {
                                      concernIds: normalizeIdsByOptions(
                                        next,
                                        concerns,
                                      ),
                                    })
                                  }
                                  columns={1}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/40">
                              <div className="grid gap-3 md:grid-cols-2">
                                {/* 左 */}
                                <div className="space-y-3">
                                  <div>
                                    <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                                      コース
                                    </div>
                                    <div className="mt-1">
                                      <TagPills
                                        labels={labelsBySelectedIds(
                                          selectedCourseIds,
                                          courses,
                                        )}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                                      好みの音楽・雰囲気（Q4）
                                    </div>
                                    <div className="mt-1">
                                      <TagPills
                                        labels={labelsBySelectedIds(
                                          selectedGenreIds,
                                          genres,
                                        )}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* 右 */}
                                <div className="space-y-3">
                                  <div>
                                    <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                                      校舎
                                    </div>
                                    <div className="mt-1">
                                      <TagPills
                                        labels={labelsBySelectedIds(
                                          selectedCampusIds,
                                          campuses,
                                        )}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                                      理想の先生（Q5）
                                    </div>
                                    <div className="mt-1">
                                      <TagPills
                                        labels={labelsBySelectedIds(
                                          selectedConcernIds,
                                          concerns,
                                        )}
                                        empty="—"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                                <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 dark:border-gray-800 dark:bg-gray-900">
                                  course: {selectedCourseIds.length}
                                </span>
                                <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 dark:border-gray-800 dark:bg-gray-900">
                                  campus: {selectedCampusIds.length}
                                </span>
                                <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 dark:border-gray-800 dark:bg-gray-900">
                                  genre: {selectedGenreIds.length}
                                </span>
                                <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 dark:border-gray-800 dark:bg-gray-900">
                                  q6: {selectedConcernIds.length}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* プロフィール */}
                        <div className="md:col-span-3">
                          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                            プロフィール（チャームポイント / 自己紹介）
                          </div>

                          {editing ? (
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                              <div>
                                <div className="mb-1 text-[11px] text-gray-600 dark:text-gray-300">
                                  チャームポイントタグ（改行で追加）
                                </div>
                                <textarea
                                  value={String(
                                    (current as any)?.charmTags ?? "",
                                  )}
                                  onChange={(ev) =>
                                    updateEditField(r.id, {
                                      charmTags: ev.target.value,
                                    })
                                  }
                                  rows={4}
                                  className={input}
                                />
                              </div>

                              <div>
                                <div className="mb-1 text-[11px] text-gray-600 dark:text-gray-300">
                                  自己紹介文
                                </div>
                                <textarea
                                  value={String(
                                    (current as any)?.introduction ?? "",
                                  )}
                                  onChange={(ev) =>
                                    updateEditField(r.id, {
                                      introduction: ev.target.value,
                                    })
                                  }
                                  rows={4}
                                  className={input}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 text-[12px] text-gray-700 dark:text-gray-200">
                              <div className="mb-2">
                                <div className="font-semibold">
                                  チャームポイント
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {String(r.charmTags ?? "")
                                    .split("\n")
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                    .map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] dark:border-gray-700"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  {(!r.charmTags ||
                                    r.charmTags.trim() === "") && (
                                    <span className="text-gray-500 dark:text-gray-400">
                                      —
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div>
                                <div className="font-semibold">自己紹介</div>
                                <div className="whitespace-pre-wrap leading-relaxed">
                                  {r.introduction?.trim()
                                    ? r.introduction
                                    : "—"}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Active */}
                        <div className="md:col-span-3">
                          {editing ? (
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                              <input
                                type="checkbox"
                                checked={Boolean((current as any)?.isActive)}
                                onChange={(ev) =>
                                  updateEditField(r.id, {
                                    isActive: ev.target.checked,
                                  })
                                }
                                className="rounded border-gray-300 dark:border-gray-700"
                              />
                              active
                            </label>
                          ) : (
                            <div
                              className={[
                                "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                r.isActive
                                  ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-200"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
                              ].join(" ")}
                            >
                              {r.isActive ? "active" : "paused"}
                            </div>
                          )}
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
                            className={btnOutline.replace(
                              "px-4 py-2 text-sm",
                              "px-3 py-1.5 text-xs",
                            )}
                          >
                            編集
                          </button>

                          {r.isActive ? (
                            <button
                              type="button"
                              onClick={() => toggleActive(r, false)}
                              disabled={saving}
                              className={btnDanger}
                            >
                              休止
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleActive(r, true)}
                              disabled={saving}
                              className={btnOutline.replace(
                                "px-4 py-2 text-sm",
                                "px-3 py-1.5 text-xs",
                              )}
                            >
                              再開
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(r.id)}
                            disabled={saving}
                            className={btnPrimary.replace(
                              "px-4 py-2 text-sm",
                              "px-3 py-1.5 text-xs",
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
                              "px-3 py-1.5 text-xs",
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
        次：<code className={codePill}>/admin/diagnosis/links</code>{" "}
        に戻って、Result と Instructor をチェックで紐づけしてください。
      </div>
    </div>
  );
}
