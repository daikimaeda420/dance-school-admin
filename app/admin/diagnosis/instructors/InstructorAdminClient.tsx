// app/admin/diagnosis/instructors/InstructorAdminClient.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
  type MouseEvent,
  type ChangeEvent,
} from "react";

type Props = { initialSchoolId?: string };

type OptionRow = {
  id: string;
  label: string;
  slug?: string;
  answerTag?: string | null;
  isOnline?: boolean;
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

  // ✅ 追加：プロフィール
  charmTags?: string | null; // 改行区切り
  introduction?: string | null;

  courses?: OptionRow[];
  genres?: OptionRow[];
  campuses?: OptionRow[];

  courseIds?: string[];
  genreIds?: string[];
  campusIds?: string[];
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

const selectBox = input + " h-40 leading-tight " + "dark:[color-scheme:dark]";

const EMPTY_IMG =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function uniqStrings(xs: string[]) {
  return Array.from(
    new Set(xs.map((s) => String(s ?? "").trim()).filter(Boolean))
  );
}

function safeJsonArray(v: any): string[] {
  if (Array.isArray(v)) return uniqStrings(v);
  return [];
}

function joinLabels(opts?: OptionRow[]) {
  return (opts ?? [])
    .map((o) => o.label)
    .filter(Boolean)
    .join(" / ");
}

/**
 * ✅ 追加：クリックだけで複数選択できるようにする（toggle）
 * - Mac/Winの⌘/Ctrl不要で複数選択できる
 * - Shift範囲選択も自然に残る
 */
function makeToggleSelectHandlers(
  selected: string[],
  setSelected: Dispatch<SetStateAction<string[]>>
) {
  const onMouseDown = (e: MouseEvent<HTMLSelectElement>) => {
    const target = e.target as HTMLElement;
    if (target?.tagName !== "OPTION") return;

    e.preventDefault(); // 単一置換を防ぐ
    const opt = target as HTMLOptionElement;
    const value = opt.value;

    setSelected((prev) => {
      const has = prev.includes(value);
      return has ? prev.filter((x) => x !== value) : [...prev, value];
    });
  };

  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    // キーボード操作などのフォールバック
    setSelected(Array.from(e.target.selectedOptions).map((o) => o.value));
  };

  return { onMouseDown, onChange, value: selected };
}

export default function InstructorAdminClient({ initialSchoolId }: Props) {
  const [schoolId, setSchoolId] = useState(initialSchoolId ?? "");

  const [rows, setRows] = useState<InstructorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [courses, setCourses] = useState<OptionRow[]>([]);
  const [genres, setGenres] = useState<OptionRow[]>([]);
  const [campuses, setCampuses] = useState<OptionRow[]>([]);

  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSortOrder, setNewSortOrder] = useState<number>(1);
  const [newIsActive, setNewIsActive] = useState(true);
  const [newFile, setNewFile] = useState<File | null>(null);

  const [newCourseIds, setNewCourseIds] = useState<string[]>([]);
  const [newGenreIds, setNewGenreIds] = useState<string[]>([]);
  const [newCampusIds, setNewCampusIds] = useState<string[]>([]);

  // ✅ 追加：新規プロフィール
  const [newCharmTags, setNewCharmTags] = useState("");
  const [newIntroduction, setNewIntroduction] = useState("");

  const [editMap, setEditMap] = useState<
    Record<string, Partial<InstructorRow>>
  >({});
  const [editFileMap, setEditFileMap] = useState<Record<string, File | null>>(
    {}
  );
  const [clearPhotoMap, setClearPhotoMap] = useState<Record<string, boolean>>(
    {}
  );

  // ✅ 追加：編集画像プレビュー（URL leak対策）
  const [editPreviewMap, setEditPreviewMap] = useState<Record<string, string>>(
    {}
  );

  const canLoad = schoolId.trim().length > 0;

  const photoUrl = (id: string) =>
    `/api/diagnosis/instructors/photo?id=${encodeURIComponent(
      id
    )}&schoolId=${encodeURIComponent(schoolId)}`;

  const fetchOptions = async () => {
    if (!canLoad) return;
    try {
      const [cRes, gRes, pRes] = await Promise.all([
        fetch(
          `/api/diagnosis/courses?schoolId=${encodeURIComponent(schoolId)}`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/diagnosis/genres?schoolId=${encodeURIComponent(schoolId)}`,
          {
            cache: "no-store",
          }
        ),
        fetch(
          `/api/diagnosis/campuses?schoolId=${encodeURIComponent(schoolId)}`,
          { cache: "no-store" }
        ),
      ]);

      const cJson = cRes.ok ? await cRes.json().catch(() => []) : [];
      const gJson = gRes.ok ? await gRes.json().catch(() => []) : [];
      const pJson = pRes.ok ? await pRes.json().catch(() => []) : [];

      const normalize = (x: any): OptionRow[] => {
        const arr = Array.isArray(x?.items)
          ? x.items
          : Array.isArray(x)
          ? x
          : [];
        return arr
          .map((d: any) => ({
            id: String(d.id ?? ""),
            label: String(d.label ?? ""),
            slug: d.slug ? String(d.slug) : undefined,
            answerTag: d.answerTag ? String(d.answerTag) : null,
            isOnline: typeof d.isOnline === "boolean" ? d.isOnline : undefined,
            isActive: typeof d.isActive === "boolean" ? d.isActive : undefined,
          }))
          .filter((o: OptionRow) => o.id && o.label);
      };

      setCourses(normalize(cJson));
      setGenres(normalize(gJson));
      setCampuses(normalize(pJson));
    } catch {
      // options は致命ではないので握る
    }
  };

  const fetchList = async () => {
    if (!canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/diagnosis/instructors?schoolId=${encodeURIComponent(schoolId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("DiagnosisInstructor の取得に失敗しました");
      const data = (await res.json()) as any[];

      const normalized: InstructorRow[] = data.map((d) => ({
        id: String(d.id),
        schoolId: String(d.schoolId ?? schoolId),
        label: String(d.label ?? ""),
        slug: String(d.slug ?? ""),
        sortOrder: Number(d.sortOrder ?? 1),
        isActive: Boolean(d.isActive ?? true),
        photoMime: typeof d.photoMime === "string" ? d.photoMime : null,

        // ✅ 追加
        charmTags: typeof d.charmTags === "string" ? d.charmTags : null,
        introduction:
          typeof d.introduction === "string" ? d.introduction : null,

        courses: Array.isArray(d.courses) ? d.courses : [],
        genres: Array.isArray(d.genres) ? d.genres : [],
        campuses: Array.isArray(d.campuses) ? d.campuses : [],
        courseIds: safeJsonArray(d.courseIds),
        genreIds: safeJsonArray(d.genreIds),
        campusIds: safeJsonArray(d.campusIds),
      }));

      setRows(normalized.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (e: any) {
      setError(e?.message ?? "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canLoad) return;
    void fetchOptions();
    void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  // ✅ create preview URL leak対策
  const previewForNew = useMemo(() => {
    if (!newFile) return "";
    return URL.createObjectURL(newFile);
  }, [newFile]);
  useEffect(() => {
    return () => {
      if (previewForNew) URL.revokeObjectURL(previewForNew);
    };
  }, [previewForNew]);

  // ✅ edit preview URL leak対策（アンマウント時に全revoke）
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
      fd.append("sortOrder", String(newSortOrder));
      fd.append("isActive", String(newIsActive));
      if (newFile) fd.append("file", newFile);

      fd.append("courseIds", JSON.stringify(uniqStrings(newCourseIds)));
      fd.append("genreIds", JSON.stringify(uniqStrings(newGenreIds)));
      fd.append("campusIds", JSON.stringify(uniqStrings(newCampusIds)));

      // ✅ 追加：プロフィール
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
      setNewSortOrder(1);
      setNewIsActive(true);
      setNewFile(null);
      setNewCourseIds([]);
      setNewGenreIds([]);
      setNewCampusIds([]);

      // ✅ 追加
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
    setEditMap((prev) => ({
      ...prev,
      [r.id]: {
        ...r,
        courseIds: safeJsonArray(r.courseIds),
        genreIds: safeJsonArray(r.genreIds),
        campusIds: safeJsonArray(r.campusIds),
        charmTags: r.charmTags ?? "",
        introduction: r.introduction ?? "",
      },
    }));
    setEditFileMap((prev) => ({ ...prev, [r.id]: null }));
    setClearPhotoMap((prev) => ({ ...prev, [r.id]: false }));
    setEditPreviewMap((prev) => ({ ...prev, [r.id]: "" }));
  };

  const cancelEdit = (id: string) => {
    // ✅ revoke preview
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
      fd.append("sortOrder", String(e.sortOrder ?? 0));
      fd.append("isActive", String(e.isActive ?? true));
      fd.append("clearPhoto", String(clearPhotoMap[id] ?? false));

      const file = editFileMap[id];
      if (file) fd.append("file", file);

      fd.append(
        "courseIds",
        JSON.stringify(uniqStrings(safeJsonArray(e.courseIds)))
      );
      fd.append(
        "genreIds",
        JSON.stringify(uniqStrings(safeJsonArray(e.genreIds)))
      );
      fd.append(
        "campusIds",
        JSON.stringify(uniqStrings(safeJsonArray(e.campusIds)))
      );

      // ✅ 追加：プロフィール
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
        `/api/diagnosis/instructors?id=${encodeURIComponent(
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

  const hintId = useMemo(
    () => `instructor_${slugifyJa(newLabel) || "new"}`,
    [newLabel]
  );
  const hintSlug = useMemo(() => slugifyJa(newLabel), [newLabel]);

  return (
    <div className="mx-auto w-full max-w-5xl p-6 text-gray-900 dark:text-gray-100">
      <div className="mb-4">
        <div className="text-base font-bold">診断編集：講師管理</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          画像は管理画面からアップロードしてDBに保存します（上限はAPI内で制御）。
        </div>
      </div>

      {/* schoolId */}
      <div className={`mb-4 ${card}`}>
        <div className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
          schoolId
        </div>
        <input
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          className={input}
          placeholder="例：daiki.maeda.web（他のIDでもOK）"
        />
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

          {/* ✅ 追加：プロフィール */}
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
                  placeholder={
                    "例：笑顔が明るい\n例：初心者に丁寧\n例：K-POP振付が得意"
                  }
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
                  placeholder="例：はじめまして。初心者の方でも楽しく踊れるように…"
                />
              </div>
            </div>
          </div>

          {/* 対応コース/ジャンル/校舎 */}
          <div className="md:col-span-2">
            <div className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
              対応（複数選択）
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                  対応コース
                </div>
                <select
                  className={selectBox}
                  multiple
                  size={8}
                  {...makeToggleSelectHandlers(newCourseIds, setNewCourseIds)}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                  対応ジャンル
                </div>
                <select
                  className={selectBox}
                  multiple
                  size={8}
                  {...makeToggleSelectHandlers(newGenreIds, setNewGenreIds)}
                >
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                  対応校舎
                </div>
                <select
                  className={selectBox}
                  multiple
                  size={8}
                  {...makeToggleSelectHandlers(newCampusIds, setNewCampusIds)}
                >
                  {campuses.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                      {typeof p.isOnline === "boolean"
                        ? p.isOnline
                          ? "（オンライン）"
                          : ""
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              ✅
              クリックで選択/解除できます（⌘/Ctrl不要）。Shiftで範囲選択もOK。
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:col-span-2">
            <div>
              <div className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                sortOrder
              </div>
              <input
                type="number"
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(Number(e.target.value))}
                className={input}
              />
            </div>
            <div className="flex items-end gap-2">
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
              const e = editMap[r.id] as Partial<InstructorRow> | undefined;
              const current = editing ? (e as InstructorRow) : r;

              const file = editFileMap[r.id] ?? null;
              const localPreview = editPreviewMap[r.id] || "";
              const hasDbPhoto = Boolean(r.photoMime);

              const currentCourseIds = safeJsonArray(current.courseIds);
              const currentGenreIds = safeJsonArray(current.genreIds);
              const currentCampusIds = safeJsonArray(current.campusIds);

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
                            value={current.label ?? ""}
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
                              value={current.slug ?? ""}
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

                                    // preview URLを作る（古いのはrevoke）
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
                                      clearPhotoMap[r.id] ?? false
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

                        {/* 対応コース/ジャンル/校舎 */}
                        <div className="md:col-span-3">
                          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                            対応（コース / ジャンル / 校舎）
                          </div>

                          {editing ? (
                            <div className="mt-2 grid gap-2 md:grid-cols-3">
                              <div>
                                <div className="mb-1 text-[11px] text-gray-600 dark:text-gray-300">
                                  コース
                                </div>
                                <select
                                  className={selectBox}
                                  multiple
                                  size={8}
                                  value={currentCourseIds}
                                  onMouseDown={(ev) => {
                                    const target = ev.target as HTMLElement;
                                    if (target?.tagName !== "OPTION") return;
                                    ev.preventDefault();
                                    const opt = target as HTMLOptionElement;
                                    const v = opt.value;
                                    updateEditField(r.id, {
                                      courseIds: currentCourseIds.includes(v)
                                        ? currentCourseIds.filter(
                                            (x) => x !== v
                                          )
                                        : [...currentCourseIds, v],
                                    });
                                  }}
                                  onChange={(ev) =>
                                    updateEditField(r.id, {
                                      courseIds: Array.from(
                                        ev.target.selectedOptions
                                      ).map((o) => o.value),
                                    })
                                  }
                                >
                                  {courses.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <div className="mb-1 text-[11px] text-gray-600 dark:text-gray-300">
                                  ジャンル
                                </div>
                                <select
                                  className={selectBox}
                                  multiple
                                  size={8}
                                  value={currentGenreIds}
                                  onMouseDown={(ev) => {
                                    const target = ev.target as HTMLElement;
                                    if (target?.tagName !== "OPTION") return;
                                    ev.preventDefault();
                                    const opt = target as HTMLOptionElement;
                                    const v = opt.value;
                                    updateEditField(r.id, {
                                      genreIds: currentGenreIds.includes(v)
                                        ? currentGenreIds.filter((x) => x !== v)
                                        : [...currentGenreIds, v],
                                    });
                                  }}
                                  onChange={(ev) =>
                                    updateEditField(r.id, {
                                      genreIds: Array.from(
                                        ev.target.selectedOptions
                                      ).map((o) => o.value),
                                    })
                                  }
                                >
                                  {genres.map((g) => (
                                    <option key={g.id} value={g.id}>
                                      {g.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <div className="mb-1 text-[11px] text-gray-600 dark:text-gray-300">
                                  校舎
                                </div>
                                <select
                                  className={selectBox}
                                  multiple
                                  size={8}
                                  value={currentCampusIds}
                                  onMouseDown={(ev) => {
                                    const target = ev.target as HTMLElement;
                                    if (target?.tagName !== "OPTION") return;
                                    ev.preventDefault();
                                    const opt = target as HTMLOptionElement;
                                    const v = opt.value;
                                    updateEditField(r.id, {
                                      campusIds: currentCampusIds.includes(v)
                                        ? currentCampusIds.filter(
                                            (x) => x !== v
                                          )
                                        : [...currentCampusIds, v],
                                    });
                                  }}
                                  onChange={(ev) =>
                                    updateEditField(r.id, {
                                      campusIds: Array.from(
                                        ev.target.selectedOptions
                                      ).map((o) => o.value),
                                    })
                                  }
                                >
                                  {campuses.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.label}
                                      {typeof p.isOnline === "boolean"
                                        ? p.isOnline
                                          ? "（オンライン）"
                                          : ""
                                        : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-1 text-[12px] text-gray-700 dark:text-gray-200">
                              <div className="mb-1">
                                <span className="font-semibold">コース：</span>
                                {joinLabels(r.courses) || "—"}
                              </div>
                              <div className="mb-1">
                                <span className="font-semibold">
                                  ジャンル：
                                </span>
                                {joinLabels(r.genres) || "—"}
                              </div>
                              <div>
                                <span className="font-semibold">校舎：</span>
                                {joinLabels(r.campuses) || "—"}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ✅ 追加：プロフィール */}
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
                                  value={(current as any).charmTags ?? ""}
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
                                  value={(current as any).introduction ?? ""}
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

                        <div className="grid grid-cols-2 gap-2 md:col-span-3">
                          <div>
                            <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
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
                                className={input}
                              />
                            ) : (
                              <div className="text-[12px] text-gray-700 dark:text-gray-200">
                                {r.sortOrder}
                              </div>
                            )}
                          </div>

                          <div className="flex items-end">
                            {editing ? (
                              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                <input
                                  type="checkbox"
                                  checked={Boolean(current.isActive)}
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
                                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                  r.isActive
                                    ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-200"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
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
                            className={btnOutline.replace(
                              "px-4 py-2 text-sm",
                              "px-3 py-1.5 text-xs"
                            )}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => deactivate(r.id)}
                            disabled={saving}
                            className={btnDanger}
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
                            className={btnPrimary.replace(
                              "px-4 py-2 text-sm",
                              "px-3 py-1.5 text-xs"
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
                              "px-3 py-1.5 text-xs"
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
