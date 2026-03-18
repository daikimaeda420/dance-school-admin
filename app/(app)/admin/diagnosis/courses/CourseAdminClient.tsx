// app/admin/diagnosis/courses/CourseAdminClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import AdminPageHeader from "../_components/AdminPageHeader";
import {
  adminCard as card,
  adminInput as inputCls,
  adminSelect as selectCls,
  adminBtnPrimary as btnPrimary,
  adminBtnDanger as btnDanger,
  adminBtn,
} from "../_components/adminStyles";

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";



type Course = {
  id: string; // ✅ DBのid(cuid) で運用（admin API側）
  schoolId: string;
  label: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  q2AnswerTags: string[];
  // ✅ 追加：Q4（ジャンル）タグ
  genreTags: string[];



  // ✅ 追加：コース説明文
  description?: string | null;

  // ✅ 追加：画像（診断結果用）
  hasImage?: boolean;
  photoUrl?: string | null;

  // ✅ 追加：YouTube動画ID
  youtubeVideoId?: string | null;
};

type Props = { schoolId: string };

const Q2_OPTIONS = [
  {
    tag: "運動自体がニガテ…リズム感にも自信がない",
    label: "運動自体がニガテ…リズム感にも自信がない",
  },
  {
    tag: "運動は普通にできるけど、ダンスは未経験",
    label: "運動は普通にできるけど、ダンスは未経験",
  },
  {
    tag: "昔少し習っていた / 学校の体育でやった程度",
    label: "昔少し習っていた / 学校の体育でやった程度",
  },
  {
    tag: "基本的なステップなら踊れる（初級レベル）",
    label: "基本的なステップなら踊れる（初級レベル）",
  },
  {
    tag: "本格的に習った経験がある / バリバリ踊りたい",
    label: "本格的に習った経験がある / バリバリ踊りたい",
  },
] as const;

function uniqStrings(xs: string[]) {
  return Array.from(
    new Set(xs.map((s) => String(s ?? "").trim()).filter(Boolean)),
  );
}

function toggleInArray(arr: string[], value: string) {
  const has = arr.includes(value);
  return has ? arr.filter((x) => x !== value) : [...arr, value];
}

function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/,
  );
  return match && match[1] ? match[1] : null;
}

/** ✅ チップ型 ON/OFF（チェックボックスのように分かりやすいUI） */
function Q2ToggleChips({
  selected,
  setSelected,
  disabled,
  dense,
}: {
  selected: string[];
  setSelected: (v: SetStateAction<string[]>) => void;
  disabled?: boolean;
  dense?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-wrap gap-2 rounded-md border border-gray-200 bg-gray-50 p-2",
        "dark:border-gray-800 dark:bg-gray-950",
        dense ? "text-[11px]" : "text-xs",
        disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      {Q2_OPTIONS.map((o) => {
        const on = selected.includes(o.tag);
        return (
          <button
            key={o.tag}
            type="button"
            disabled={disabled}
            onClick={() =>
              setSelected((prev) => uniqStrings(toggleInArray(prev, o.tag)))
            }
            aria-pressed={on}
            className={[
              "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-left",
              "transition select-none",
              on
                ? "border-blue-500 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-500"
                : "border-gray-300 bg-white text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800",
              disabled ? "cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
            title={o.label}
          >
            <span
              className={[
                "inline-flex h-4 w-4 items-center justify-center rounded-sm border",
                on
                  ? "border-white/70 bg-white/20"
                  : "border-gray-300 bg-transparent dark:border-gray-600",
              ].join(" ")}
            >
              {on ? (
                <span className="text-[12px] leading-none">✓</span>
              ) : (
                <span className="text-[12px] leading-none opacity-0 group-hover:opacity-30">
                  ✓
                </span>
              )}
            </span>

            <span className="min-w-0">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** ✅ Q4 (ジャンル) 用トグルチップ */
function Q4ToggleChips({
  selected,
  setSelected,
  genres, // ✅ 追加
  disabled,
  dense,
}: {
  selected: string[];
  setSelected: (v: SetStateAction<string[]>) => void;
  genres: Array<{ label: string; slug: string }>; // ✅ 追加
  disabled?: boolean;
  dense?: boolean;
}) {
  const options = genres.map((g, idx) => ({
    id: `dynamic-${idx}`,
    label: g.label,
    tag: g.slug,
  }));

  return (
    <div
      className={[
        "flex flex-wrap gap-2 rounded-md border border-gray-200 bg-gray-50 p-2",
        "dark:border-gray-800 dark:bg-gray-950",
        dense ? "text-[11px]" : "text-xs",
        disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      {options.map((o) => {
        const tag = o.tag ?? "";
        if (!tag) return null;
        const on = selected.includes(tag);
        return (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() =>
              setSelected((prev) => uniqStrings(toggleInArray(prev, tag)))
            }
            aria-pressed={on}
            className={[
              "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-left",
              "transition select-none",
              on
                ? "border-pink-500 bg-pink-600 text-white dark:border-pink-400 dark:bg-pink-500"
                : "border-gray-300 bg-white text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800",
              disabled ? "cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
            title={o.label}
          >
            <span
              className={[
                "inline-flex h-4 w-4 items-center justify-center rounded-sm border",
                on
                  ? "border-white/70 bg-white/20"
                  : "border-gray-300 bg-transparent dark:border-gray-600",
              ].join(" ")}
            >
              {on ? (
                <span className="text-[12px] leading-none">✓</span>
              ) : (
                <span className="text-[12px] leading-none opacity-0 group-hover:opacity-30">
                  ✓
                </span>
              )}
            </span>

            <span className="min-w-0">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * ✅ DnD：div行をsortableに（tableをやめて横スクロール撲滅）
 */
function SortableRow({
  id,
  disabled,
  handle,
  children,
}: {
  id: string;
  disabled?: boolean;
  handle: (p: { attributes: any; listeners: any }) => React.ReactNode;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900 " +
        (isDragging ? "ring-2 ring-blue-400/40" : "")
      }
    >
      {/* 1行目：ハンドル + 基本情報 */}
      <div className="flex items-start gap-2">
        <div className="pt-0.5">{handle({ attributes, listeners })}</div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function CourseAdminClient({ schoolId }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const originalRef = useRef<Course[]>([]);
  const [genres, setGenres] = useState<Array<{ label: string; slug: string }>>(
    [],
  ); // ✅ 追加
  const [genresLoading, setGenresLoading] = useState(true); // ✅ genres取得中フラグ
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [savingSort, setSavingSort] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 新規追加
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSortOrder, setNewSortOrder] = useState<number>(0); // UIは出さない
  const [newIsActive, setNewIsActive] = useState(true);
  const [newQ2Tags, setNewQ2Tags] = useState<string[]>([]);
  // ✅ 追加
  const [newGenreTags, setNewGenreTags] = useState<string[]>([]);

  // ✅ 追加：コース説明文（新規）
  const [newDescription, setNewDescription] = useState<string>("");

  // ✅ 追加：YouTube動画URL（新規）
  const [newYoutubeUrl, setNewYoutubeUrl] = useState<string>("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  // ✅ 行ごとの画像アップロード用
  const [pendingFiles, setPendingFiles] = useState<Record<string, File | null>>(
    {},
  );

  const disabled = !schoolId;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const courseIds = useMemo(() => courses.map((c) => c.id), [courses]);



  const fetchCourses = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/diagnosis/courses?schoolId=${encodeURIComponent(schoolId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("コース一覧の取得に失敗しました。");

      const data = (await res.json()) as any[];
      const normalized: Course[] = (Array.isArray(data) ? data : []).map(
        (d) => ({
          id: String(d.id),
          schoolId: String(d.schoolId ?? schoolId),
          label: String(d.label ?? ""),
          slug: String(d.slug ?? ""),
          sortOrder: Number(d.sortOrder ?? 0),
          isActive: Boolean(d.isActive ?? true),
          q2AnswerTags: Array.isArray(d.q2AnswerTags)
            ? uniqStrings(d.q2AnswerTags)
            : [],
          // ✅ 追加
          genreTags: Array.isArray(d.genreTags)
            ? uniqStrings(d.genreTags)
            : [],


          // ✅ 追加：コース説明文
          description: typeof d.description === "string" ? d.description : null,

          hasImage: Boolean(d.hasImage ?? false),
          photoUrl: typeof d.photoUrl === "string" ? d.photoUrl : null,
          youtubeVideoId: typeof d.youtubeVideoId === "string" ? d.youtubeVideoId : null,
        }),
      );

      normalized.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setCourses(normalized);
      originalRef.current = normalized;
    } catch (e) {
      console.error(e);
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const [debugInfo, setDebugInfo] = useState<string>(""); // ✅ Debug info

  const fetchGenres = async () => {
    if (!schoolId) return;
    setGenresLoading(true);
    try {
      const res = await fetch(
        `/api/admin/diagnosis/genres?schoolId=${encodeURIComponent(schoolId)}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = await res.json();
        const activeGenres = (data.genres || []).filter(
          (g: { label: string; slug: string; isActive?: boolean }) =>
            g.isActive !== false,
        );
        console.log("DEBUG fetchGenres active:", activeGenres.length, "件", activeGenres.map((g: any) => g.label));
        setGenres(activeGenres);
        
        // Debug info from server
        if (data.debug) {
            setDebugInfo(`Count:${data.debug.count}, ID:${data.debug.schoolId}`);
        }
      } else {
        console.error("fetchGenres: HTTP", res.status, await res.text().catch(() => ""));
      }
    } catch (e) {
      console.error("fetchGenres error:", e);
    } finally {
      setGenresLoading(false);
    }
  };

  useEffect(() => {
    void fetchCourses();
    void fetchGenres(); // ✅ 追加
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  // ✅ 画像アップロード（公開GET / 認証POST）
  const uploadCoursePhoto = async (courseId: string, file: File) => {
    const fd = new FormData();
    fd.append("id", courseId);
    fd.append("schoolId", schoolId);
    fd.append("file", file);

    const res = await fetch("/api/diagnosis/courses/photo", {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message ?? "画像アップロードに失敗しました。");
    }
  };

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
          q2AnswerTags: uniqStrings(newQ2Tags),
          // ✅ 追加
          genreTags: uniqStrings(newGenreTags),



          // ✅ 追加：説明文
          description: newDescription ? newDescription : null,
          youtubeVideoId: extractYouTubeId(newYoutubeUrl),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "作成に失敗しました。");
      }

      // ✅ 作成後に画像があればアップロード（courseIdが必要）
      const created = await res.json().catch(() => null);
      const createdId = String(created?.id ?? "");

      if (createdId && newImageFile) {
        await uploadCoursePhoto(createdId, newImageFile);
      }

      setNewLabel("");
      setNewSlug("");
      setNewSortOrder(0);
      setNewIsActive(true);
      setNewQ2Tags([]);
      setNewGenreTags([]);

      setNewImageFile(null);

      // ✅ 追加
      setNewDescription("");
      setNewYoutubeUrl("");

      await fetchCourses();
    } catch (e: any) {
      setError(e?.message ?? "通信エラーが発生しました。");
    } finally {
      setSaving(false);
    }
  };

  const isDirty = useMemo(() => {
    if (courses.length !== originalRef.current.length) return true;
    for (let i = 0; i < courses.length; i++) {
      const c = courses[i];
      const o = originalRef.current[i];
      if (c.id !== o.id) return true;
      if (c.label !== o.label) return true;
      if (c.slug !== o.slug) return true;
      if (c.isActive !== o.isActive) return true;
      if (c.description !== o.description) return true;
      if (c.youtubeVideoId !== o.youtubeVideoId) return true;
      if (JSON.stringify(c.q2AnswerTags) !== JSON.stringify(o.q2AnswerTags)) return true;
      if (JSON.stringify(c.genreTags) !== JSON.stringify(o.genreTags)) return true;
      if (c.sortOrder !== o.sortOrder) return true;
    }
    return false;
  }, [courses]);

  const handleUploadRowPhoto = async (id: string) => {
    const file = pendingFiles[id];
    if (!file) return;

    setSaving(true);
    setSavingRowId(id);
    setError(null);
    try {
      await uploadCoursePhoto(id, file);
      setPendingFiles((prev) => ({ ...prev, [id]: null }));
      await fetchCourses();
    } catch (e: any) {
      setError(e?.message ?? "画像アップロードに失敗しました。");
    } finally {
      setSaving(false);
      setSavingRowId(null);
    }
  };

  const confirmDelete = async (id: string) => {
    if (!window.confirm("このコースを削除しますか？")) return;
    setSaving(true);
    setSavingRowId(id);
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
      originalRef.current = originalRef.current.filter((c) => c.id !== id);
    } catch (e: any) {
      setError(e?.message ?? "通信エラーが発生しました。");
    } finally {
      setSaving(false);
      setSavingRowId(null);
    }
  };

  const saveAll = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    setError(null);

    try {
      for (const cur of courses) {
        const orig = originalRef.current.find((o) => o.id === cur.id);
        if (!orig) continue;

        if (
          cur.label !== orig.label ||
          cur.slug !== orig.slug ||
          cur.isActive !== orig.isActive ||
          cur.description !== orig.description ||
          cur.youtubeVideoId !== orig.youtubeVideoId ||
          JSON.stringify(cur.q2AnswerTags) !== JSON.stringify(orig.q2AnswerTags) ||
          JSON.stringify(cur.genreTags) !== JSON.stringify(orig.genreTags) ||
          cur.sortOrder !== orig.sortOrder
        ) {
          const res = await fetch(`/api/admin/diagnosis/courses/${cur.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: cur.label.trim(),
              slug: cur.slug.trim(),
              sortOrder: cur.sortOrder,
              isActive: cur.isActive,
              q2AnswerTags: cur.q2AnswerTags,
              genreTags: cur.genreTags,
              description: cur.description ? cur.description.trim() : null,
              youtubeVideoId: cur.youtubeVideoId ? cur.youtubeVideoId.trim() : null,
            }),
          });
          if (!res.ok) {
             const data = await res.json().catch(() => null);
             throw new Error(data?.message ?? `ID:${cur.id} の保存に失敗`);
          }
        }
      }
      await fetchCourses();
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "一括保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const discardAll = () => {
    if (!window.confirm("編集内容を破棄して元に戻しますか？")) return;
    setCourses(originalRef.current);
    setError(null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;
    if (saving) return;

    setCourses((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === String(active.id));
      const newIndex = prev.findIndex((c) => c.id === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return prev;

      const moved = arrayMove(prev, oldIndex, newIndex);
      return moved.map((item, index) => ({
        ...item,
        sortOrder: (index + 1) * 10,
      }));
    });
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="診断：コース管理"
        description="コースの追加・編集・並び順（ドラッグ）の変更が可能です。変更後は「保存」を押してください。"
        isDirty={isDirty}
        saving={saving}
        error={error}
        onSave={saveAll}
        onDiscard={discardAll}
      />

      {/* 新規追加 */}
      <div className={card}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            新しいコースを追加
          </h2>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <input
            className={inputCls}
            placeholder="コース名（例：初心者）"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            disabled={disabled || saving || savingSort}
          />
          <input
            className={inputCls}
            placeholder="slug（例：beginner）"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            disabled={disabled || saving || savingSort}
          />
          <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
            <input
              type="checkbox"
              checked={newIsActive}
              onChange={(e) => setNewIsActive(e.target.checked)}
              disabled={disabled || saving || savingSort}
            />
            有効
          </label>
        </div>

        {/* 画像（任意） */}
        <div className="mt-2">
          <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
            診断結果画像（任意）
          </div>
          <input
            className={inputCls}
            type="file"
            accept="image/*"
            onChange={(e) => setNewImageFile(e.target.files?.[0] ?? null)}
            disabled={disabled || saving || savingSort}
          />
          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            ※ 3MBまで
          </div>
        </div>

        {/* ✅ コース説明（任意） */}
        <div className="mt-2">
          <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
            コース説明（任意）
          </div>
          <textarea
            className={inputCls + " min-h-[84px] py-2"}
            placeholder="例：初心者向けに基礎からゆっくり。リズムトレーニング〜振付まで丁寧に進めます。"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            disabled={disabled || saving || savingSort}
          />
          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            ※ 診断結果に表示するなら 120〜200文字くらいが読みやすいです
          </div>
        </div>

        {/* ✅ YouTube動画（任意） */}
        <div className="mt-2">
          <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
            YouTube動画URL（任意）※結果画面のクラス紹介に埋め込まれます
          </div>
          <input
            className={inputCls}
            placeholder="例：https://www.youtube.com/watch?v=..."
            value={newYoutubeUrl}
            onChange={(e) => setNewYoutubeUrl(e.target.value)}
            disabled={disabled || saving || savingSort}
          />
          {newYoutubeUrl && extractYouTubeId(newYoutubeUrl) && (
            <div className="mt-2 overflow-hidden rounded-md border border-gray-200">
              <iframe
                className="aspect-video w-full"
                src={`https://www.youtube.com/embed/${extractYouTubeId(newYoutubeUrl)}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>

        <div className="mt-2">
          <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
            Q2 対応（経験・運動レベル）※複数OK
          </div>

          <Q2ToggleChips
            selected={newQ2Tags}
            setSelected={setNewQ2Tags}
            disabled={disabled || saving || savingSort}
          />

          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            ※ クリックでON/OFF（青＝ON）
          </div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            ※ クリックでON/OFF（青＝ON）
          </div>
        </div>

        {/* ✅ ジャンル (Q4) */}
        <div className="mt-2">
          <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
            Q4 ジャンル（複数OK）{!genresLoading && `— 取得: ${genres.length}件 (SRV: ${debugInfo})`}
          </div>

          {/* genres取得完了後にジャンルが0件の場合のみ警告 */}
          {!genresLoading && genres.length === 0 && (
            <div className="mb-1 rounded border border-yellow-300 bg-yellow-50 p-1 text-[10px] text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200">
              ⚠ ジャンルが0件です。APIからの取得に失敗している可能性があります。
            </div>
          )}

          <Q4ToggleChips
            selected={newGenreTags}
            setSelected={setNewGenreTags}
            genres={genres} // ✅ 追加
            disabled={disabled || saving || savingSort}
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={disabled || saving}
          className={btnPrimary + " mt-4"}
        >
          {saving && !savingRowId ? "作成中..." : "コースを追加"}
        </button>
      </div>

      {/* 一覧 */}
      <div className={card}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            コース一覧
          </h2>
          <div className="flex items-center gap-2">
            {(loading || savingSort) && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {loading ? "読み込み中..." : "並び替え保存中..."}
              </span>
            )}
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              ☰ を掴んで並び替え
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        {courses.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            登録されているコースはありません。
          </p>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={courseIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {courses.map((c) => {
                    const setRowSelected = (v: SetStateAction<string[]>) => {
                      // ✅ 先に next を確定させる（setState の中で確定させない）
                      const base = c.q2AnswerTags ?? [];
                      const nextValue =
                        typeof v === "function"
                          ? (v as (prev: string[]) => string[])(base)
                          : v;

                      const normalized = uniqStrings(nextValue ?? []);

                      // ✅ UI反映
                      setCourses((prev) =>
                        prev.map((p) =>
                          p.id === c.id
                            ? { ...p, q2AnswerTags: normalized }
                            : p,
                        ),
                      );
                    };

                    const rowSaving = savingRowId === c.id;
                    const dndDisabled = saving || rowSaving;

                    const pending = pendingFiles[c.id] ?? null;

                    return (
                      <SortableRow
                        key={c.id}
                        id={c.id}
                        disabled={dndDisabled}
                        handle={({ attributes, listeners }) => (
                          <button
                            type="button"
                            className="cursor-grab select-none rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50 active:cursor-grabbing disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                            aria-label="ドラッグして並び替え"
                            disabled={dndDisabled}
                            {...attributes}
                            {...listeners}
                          >
                            ☰
                          </button>
                        )}
                      >
                        <div className="grid gap-2 md:grid-cols-12">
                          <div className="md:col-span-3">
                            <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                              コース名
                            </div>
                            <input
                              className={inputCls}
                              value={c.label}
                              onChange={(e) =>
                                setCourses((prev) =>
                                  prev.map((p) =>
                                    p.id === c.id
                                      ? { ...p, label: e.target.value }
                                      : p,
                                  ),
                                )
                              }
                              disabled={saving}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                              slug
                            </div>
                            <input
                              className={inputCls}
                              value={c.slug}
                              onChange={(e) =>
                                setCourses((prev) =>
                                  prev.map((p) =>
                                    p.id === c.id
                                      ? { ...p, slug: e.target.value }
                                      : p,
                                  ),
                                )
                              }
                              disabled={saving}
                            />
                          </div>



                          <div className="md:col-span-2">
                            <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                              Q2対応（複数）
                            </div>
                            <Q2ToggleChips
                              selected={c.q2AnswerTags ?? []}
                              setSelected={setRowSelected}
                              disabled={saving || savingSort}
                              dense
                            />
                          </div>

                          {/* ✅ ジャンル (Q4) */}
                          <div className="md:col-span-2">
                             <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                              Q4 ジャンル
                            </div>
                            <Q4ToggleChips
                              selected={c.genreTags ?? []}
                              setSelected={(v) => {
                                const base = c.genreTags ?? [];
                                const nextValue =
                                  typeof v === "function"
                                    ? (v as (prev: string[]) => string[])(base)
                                    : v;
                                const normalized = uniqStrings(nextValue ?? []);
                                setCourses((prev) =>
                                  prev.map((p) =>
                                    p.id === c.id
                                      ? { ...p, genreTags: normalized }
                                      : p,
                                  ),
                                );
                              }}
                              genres={genres}
                              disabled={saving}
                              dense
                            />
                          </div>

                          {/* ✅ 画像 */}
                          <div className="md:col-span-2">
                            <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                              診断結果画像
                            </div>

                            <div className="flex items-start gap-2">
                              <div className="h-12 w-12 overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
                                {c.photoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={c.photoUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                                    no
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <input
                                  className={inputCls}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    setPendingFiles((prev) => ({
                                      ...prev,
                                      [c.id]: e.target.files?.[0] ?? null,
                                    }))
                                  }
                                  disabled={saving || savingSort || rowSaving}
                                />
                                <div className="mt-1 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleUploadRowPhoto(c.id)}
                                    disabled={
                                      saving ||
                                      savingSort ||
                                      rowSaving ||
                                      !pending
                                    }
                                    className="rounded-full border border-gray-300 bg-white px-3 py-1 text-[11px] font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900"
                                  >
                                    {rowSaving
                                      ? "保存中..."
                                      : "画像アップロード"}
                                  </button>

                                  {pending && (
                                    <span className="truncate text-[10px] text-gray-500 dark:text-gray-400">
                                      選択中: {pending.name}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                                  ※ 3MBまで / 差し替えは再アップロード
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ✅ 説明文（フル幅） */}
                          <div className="md:col-span-12">
                            <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                              コース説明
                            </div>
                            <textarea
                              className={inputCls + " min-h-[84px] py-2"}
                              value={c.description ?? ""}
                              onChange={(e) =>
                                setCourses((prev) =>
                                  prev.map((p) =>
                                    p.id === c.id
                                      ? { ...p, description: e.target.value }
                                      : p,
                                  ),
                                )
                              }
                              disabled={saving}
                              placeholder="例：初心者向けに基礎からゆっくり。リズムトレーニング〜振付まで丁寧に進めます。"
                            />
                            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                              ※ 診断結果に表示するなら 120〜200文字くらいが読みやすいです。
                            </div>
                          </div>

                          {/* ✅ YouTube動画URL（フル幅） */}
                          <div className="md:col-span-12">
                            <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                              YouTube動画URL ※結果画面のクラス紹介に埋め込まれます
                            </div>
                            <input
                              className={inputCls}
                              placeholder="例：https://www.youtube.com/watch?v=..."
                              value={
                                // 入力中のURLを持たせるため、Course型ではなく一時Stateとして管理するか、
                                // URLをそのまま持ってonBlurでID化するか選択する。
                                // ここでは、元のURLを保持していないため、再入力用に https://youtu.be/~ の形式で表示
                                c.youtubeVideoId ? `https://youtu.be/${c.youtubeVideoId}` : ""
                              }
                              onChange={(e) => {
                                const url = e.target.value;
                                const videoId = extractYouTubeId(url);
                                // inputにはURLを入力させるが、状態としてはidを保持
                                setCourses((prev) =>
                                  prev.map((p) =>
                                    p.id === c.id
                                      ? { ...p, youtubeVideoId: videoId || url } // IDが取れなければURLをそのまま持って編集可能にする
                                      : p,
                                  ),
                                );
                              }}
                              onBlur={(e) => {
                                const url = e.target.value;
                                const videoId = extractYouTubeId(url);
                                setCourses((prev) =>
                                  prev.map((p) =>
                                    p.id === c.id
                                      ? { ...p, youtubeVideoId: videoId ? videoId : null }
                                      : p,
                                  ),
                                );
                              }}
                              disabled={saving}
                            />
                            {c.youtubeVideoId && !c.youtubeVideoId.includes("http") && (
                              <div className="mt-2 w-full max-w-[320px] overflow-hidden rounded-md border border-gray-200">
                                <iframe
                                  className="aspect-video w-full"
                                  src={`https://www.youtube.com/embed/${c.youtubeVideoId}`}
                                  title="YouTube preview"
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            )}
                            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                              ※ URLを入力し、フォーカスを外すと保存（onBlur）
                            </div>
                          </div>

                          {/* 操作 */}
                          <div className="md:col-span-12">
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                              <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
                                <input
                                  type="checkbox"
                                  checked={c.isActive}
                                  onChange={(e) =>
                                    setCourses((prev) =>
                                      prev.map((p) =>
                                        p.id === c.id
                                          ? { ...p, isActive: e.target.checked }
                                          : p,
                                      ),
                                    )
                                  }
                                  disabled={saving}
                                />
                                有効
                              </label>

                              <button
                                onClick={() => confirmDelete(c.id)}
                                className={btnDanger + " px-3 py-1 text-[11px]"}
                                disabled={saving || rowSaving}
                              >
                                削除
                              </button>
                            </div>
                          </div>
                        </div>
                      </SortableRow>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              ※ 並べ替えは「☰」をドラッグ＆ドロップ。 画像アップロード後は「画像アップロード」をクリック。
              すべて編集したらページ上部の「保存」を押してください。
            </div>
          </>
        )}
      </div>
    </div>
  );
}
