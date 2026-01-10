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

type Course = {
  id: string;
  schoolId: string;
  label: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  q2AnswerTags: string[];
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
    new Set(xs.map((s) => String(s ?? "").trim()).filter(Boolean))
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

  const disabled = !schoolId;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const courseIds = useMemo(() => courses.map((c) => c.id), [courses]);

  const fetchCourses = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/diagnosis/courses?schoolId=${encodeURIComponent(schoolId)}`,
        { cache: "no-store" }
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
        })
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
      setNewQ2Tags([]);

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
      "label" | "slug" | "sortOrder" | "isActive" | "q2AnswerTags"
    >,
    value: string | number | boolean | string[]
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
          })
        )
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

        <div className="mt-2">
          <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
            Q2 対応（経験・運動レベル）※複数OK
          </div>

          {/* ✅ ここがチェックボックスのように分かりやすいUI */}
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
                                  p.q2AnswerTags ?? []
                                )
                              : v;
                          return {
                            ...p,
                            q2AnswerTags: uniqStrings(nextValue ?? []),
                          };
                        })
                      );
                    };

                    const rowSaving = savingRowId === c.id;
                    const dndDisabled = saving || savingSort || rowSaving;

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
                          <div className="md:col-span-4">
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
                                      : p
                                  )
                                )
                              }
                              onBlur={(e) =>
                                handleUpdateField(c.id, "label", e.target.value)
                              }
                              disabled={saving || savingSort}
                            />
                          </div>

                          <div className="md:col-span-3">
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
                                      : p
                                  )
                                )
                              }
                              onBlur={(e) =>
                                handleUpdateField(c.id, "slug", e.target.value)
                              }
                              disabled={saving || savingSort}
                            />
                          </div>

                          <div className="md:col-span-3">
                            <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                              Q2対応（複数）
                            </div>

                            {/* ✅ ここをチップ型ON/OFFに */}
                            <Q2ToggleChips
                              selected={c.q2AnswerTags ?? []}
                              setSelected={setRowSelected}
                              disabled={saving || savingSort}
                              dense
                            />
                          </div>

                          <div className="md:col-span-2">
                            <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                              操作
                            </div>

                            <label className="mb-2 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
                              <input
                                type="checkbox"
                                checked={c.isActive}
                                onChange={(e) =>
                                  handleUpdateField(
                                    c.id,
                                    "isActive",
                                    e.target.checked
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
                                    uniqStrings(c.q2AnswerTags ?? [])
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
                      </SortableRow>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              ※ 並び替えは「☰」をドラッグ → ドロップで自動保存 /
              Q2はチップでON/OFF → 「保存」
            </div>
          </>
        )}
      </div>
    </div>
  );
}
