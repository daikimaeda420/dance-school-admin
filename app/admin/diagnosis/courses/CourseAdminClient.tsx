// app/admin/diagnosis/courses/CourseAdminClient.tsx
"use client";

import { useEffect, useMemo, useState, type SetStateAction } from "react";

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

// ✅ Q4 options を拾う
import { QUESTIONS } from "@/lib/diagnosis/config";

type Course = {
  id: string; // ✅ DBのid(cuid) で運用（admin API側）
  schoolId: string;
  label: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  q2AnswerTags: string[];

  // ✅ 追加：Q4紐づけ
  answerTag: string | null;

  // ✅ 追加：コース説明文
  description?: string | null;

  // ✅ 追加：画像（診断結果用）
  hasImage?: boolean;
  photoUrl?: string | null;
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

const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
  "disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500";

const selectCls =
  inputCls +
  " appearance-none pr-7 bg-[length:10px_10px] bg-no-repeat bg-[right_8px_center] " +
  "bg-[image:linear-gradient(45deg,transparent_50%,#888_50%),linear-gradient(135deg,#888_50%,transparent_50%)] " +
  "bg-[position:right_14px_center,right_9px_center] dark:bg-[image:linear-gradient(45deg,transparent_50%,#aaa_50%),linear-gradient(135deg,#aaa_50%,transparent_50%)]";

export default function CourseAdminClient({ schoolId }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
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

  // ✅ 追加：コース説明文（新規）
  const [newDescription, setNewDescription] = useState<string>("");

  // ✅ 追加
  const [newAnswerTag, setNewAnswerTag] = useState<string>(""); // "" = 未設定
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

  // ✅ Q4 options: QUESTIONS から取得
  const q4Options = useMemo(() => {
    const q4 = QUESTIONS.find((q: any) => q.id === "Q4") as any;
    const opts = Array.isArray(q4?.options) ? q4.options : [];
    const mapped = opts
      .map((o: any) => ({
        id: String(o?.id ?? ""),
        label: String(o?.label ?? o?.value ?? o?.id ?? ""),
        tag: typeof o?.tag === "string" ? String(o.tag) : "",
      }))
      .filter((x: any) => x.tag && x.label);
    return mapped;
  }, []);

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
          answerTag: typeof d.answerTag === "string" ? d.answerTag : null,

          // ✅ 追加：コース説明文
          description: typeof d.description === "string" ? d.description : null,

          hasImage: Boolean(d.hasImage ?? false),
          photoUrl: typeof d.photoUrl === "string" ? d.photoUrl : null,
        }),
      );

      normalized.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setCourses(normalized);
    } catch (e) {
      console.error(e);
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCourses();
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
          answerTag: newAnswerTag ? newAnswerTag : null,

          // ✅ 追加：説明文
          description: newDescription ? newDescription : null,
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
      setNewAnswerTag("");
      setNewImageFile(null);

      // ✅ 追加
      setNewDescription("");

      await fetchCourses();
    } catch (e: any) {
      setError(e?.message ?? "通信エラーが発生しました。");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateField = async (
    id: string,
    field: keyof Pick<
      Course,
      | "label"
      | "slug"
      | "sortOrder"
      | "isActive"
      | "q2AnswerTags"
      | "answerTag"
      | "description"
    >,
    value: string | number | boolean | string[] | null,
  ) => {
    setSaving(true);
    setSavingRowId(id);
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
      setSavingRowId(null);
    }
  };

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
      setError(e?.message ?? "通信エラーが発生しました。");
    } finally {
      setSaving(false);
      setSavingRowId(null);
    }
  };

  const handleDelete = async (id: string) => {
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
    } catch (e: any) {
      setError(e?.message ?? "通信エラーが発生しました。");
    } finally {
      setSaving(false);
      setSavingRowId(null);
    }
  };

  const saveSortOrderForList = async (nextList: Course[]) => {
    if (!schoolId) return;
    setSavingSort(true);
    setError(null);

    const prevMap = new Map(courses.map((c) => [c.id, c.sortOrder]));
    const payload = nextList.map((c, idx) => ({
      id: c.id,
      sortOrder: idx + 1,
      prevSortOrder: prevMap.get(c.id) ?? 0,
    }));

    const changed = payload.filter((p) => p.sortOrder !== p.prevSortOrder);
    if (changed.length === 0) {
      setSavingSort(false);
      return;
    }

    // optimistic
    setCourses(nextList.map((c, idx) => ({ ...c, sortOrder: idx + 1 })));

    try {
      await Promise.all(
        changed.map((p) =>
          fetch(`/api/admin/diagnosis/courses/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: p.sortOrder }),
          }).then(async (r) => {
            if (!r.ok) {
              const data = await r.json().catch(() => null);
              throw new Error(data?.message ?? "並び順の保存に失敗しました。");
            }
          }),
        ),
      );
      await fetchCourses();
    } catch (e: any) {
      await fetchCourses();
      setError(e?.message ?? "通信エラーが発生しました。");
    } finally {
      setSavingSort(false);
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;
    if (saving || savingSort) return;

    setCourses((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === String(active.id));
      const newIndex = prev.findIndex((c) => c.id === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return prev;

      const next = arrayMove(prev, oldIndex, newIndex);
      void saveSortOrderForList(next);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* 新規追加 */}
      <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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

        {/* ✅ Q4紐づけ */}
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
              Q4紐づけ（answerTag）
            </div>
            <select
              className={selectCls}
              value={newAnswerTag}
              onChange={(e) => setNewAnswerTag(e.target.value)}
              disabled={disabled || saving || savingSort}
            >
              <option value="">未設定（紐づけなし）</option>
              {q4Options.map((o) => (
                <option key={o.id} value={o.tag}>
                  {o.label}（{o.tag}）
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              ※ Q4の選択肢（tag）とコースを紐づけます
            </div>
          </div>

          {/* ✅ 画像（任意） */}
          <div className="md:col-span-1">
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
        </div>

        <button
          onClick={handleCreate}
          disabled={disabled || saving || savingSort}
          className="mt-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {saving ? "保存中..." : "コースを追加"}
        </button>
      </div>

      {/* 一覧 */}
      <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
                      setCourses((prev) =>
                        prev.map((p) => {
                          if (p.id !== c.id) return p;
                          const nextValue =
                            typeof v === "function"
                              ? (v as (prev: string[]) => string[])(
                                  p.q2AnswerTags ?? [],
                                )
                              : v;
                          return {
                            ...p,
                            q2AnswerTags: uniqStrings(nextValue ?? []),
                          };
                        }),
                      );
                    };

                    const rowSaving = savingRowId === c.id;
                    const dndDisabled = saving || savingSort || rowSaving;

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
                              onBlur={(e) =>
                                handleUpdateField(c.id, "label", e.target.value)
                              }
                              disabled={saving || savingSort}
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
                              onBlur={(e) =>
                                handleUpdateField(c.id, "slug", e.target.value)
                              }
                              disabled={saving || savingSort}
                            />
                          </div>

                          {/* ✅ answerTag */}
                          <div className="md:col-span-3">
                            <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                              Q4紐づけ（answerTag）
                            </div>
                            <select
                              className={selectCls}
                              value={c.answerTag ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setCourses((prev) =>
                                  prev.map((p) =>
                                    p.id === c.id
                                      ? { ...p, answerTag: v ? v : null }
                                      : p,
                                  ),
                                );
                              }}
                              onBlur={() =>
                                handleUpdateField(
                                  c.id,
                                  "answerTag",
                                  c.answerTag ?? null,
                                )
                              }
                              disabled={saving || savingSort}
                            >
                              <option value="">未設定（紐づけなし）</option>
                              {q4Options.map((o) => (
                                <option key={o.id} value={o.tag}>
                                  {o.label}（{o.tag}）
                                </option>
                              ))}
                            </select>
                            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                              ※ Q4のtagと一致させてください
                            </div>
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
                              onBlur={(e) =>
                                handleUpdateField(
                                  c.id,
                                  "description",
                                  e.target.value ? e.target.value : null,
                                )
                              }
                              disabled={saving || savingSort}
                              placeholder="例：初心者向けに基礎からゆっくり。リズムトレーニング〜振付まで丁寧に進めます。"
                            />
                            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                              ※ 入力後、フォーカスを外すと保存（onBlur）
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
                                    handleUpdateField(
                                      c.id,
                                      "isActive",
                                      e.target.checked,
                                    )
                                  }
                                  disabled={saving || savingSort}
                                />
                                有効
                              </label>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    handleUpdateField(
                                      c.id,
                                      "q2AnswerTags",
                                      uniqStrings(c.q2AnswerTags ?? []),
                                    )
                                  }
                                  disabled={saving || savingSort || rowSaving}
                                  className="rounded-full border border-gray-300 bg-white px-3 py-1 text-[11px] font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900"
                                >
                                  {rowSaving ? "保存中..." : "保存"}
                                </button>

                                <button
                                  onClick={() => handleDelete(c.id)}
                                  className="text-[11px] text-red-600 underline hover:text-red-700 disabled:opacity-40 dark:text-red-300 dark:hover:text-red-200"
                                  disabled={saving || savingSort || rowSaving}
                                >
                                  削除
                                </button>
                              </div>
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
              ※ 並び替えは「☰」をドラッグ → ドロップで自動保存 /
              Q2はチップでON/OFF → 「保存」 / 画像は「画像アップロード」 /
              説明文は入力後にフォーカスを外すと保存
            </div>
          </>
        )}
      </div>
    </div>
  );
}
