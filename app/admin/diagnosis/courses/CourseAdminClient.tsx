// app/admin/diagnosis/courses/CourseAdminClient.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ChangeEvent,
  type SetStateAction,
} from "react";

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

  // ✅ Q2（複数）
  q2AnswerTags: string[];
};

type Props = {
  schoolId: string;
};

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

// Cmd/Ctrl不要でポチポチ選択できる
function makeToggleSelectHandlers(
  selected: string[],
  setSelected: (v: SetStateAction<string[]>) => void
) {
  const onMouseDown = (e: MouseEvent<HTMLSelectElement>) => {
    const target = e.target as HTMLElement;
    if (target?.tagName !== "OPTION") return;

    e.preventDefault();
    const opt = target as HTMLOptionElement;
    const value = opt.value;

    setSelected((prev) => {
      const has = prev.includes(value);
      return has ? prev.filter((x) => x !== value) : [...prev, value];
    });
  };

  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelected(Array.from(e.target.selectedOptions).map((o) => o.value));
  };

  return { onMouseDown, onChange, value: selected };
}

/**
 * ✅ DnD用：<tr> を sortable にする
 * - ドラッグは左の「☰ハンドル」だけ
 * - select 等の操作と干渉しにくい
 */
function SortableTr({
  id,
  children,
  disabled,
  handleProps,
}: {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
  handleProps: (p: { attributes: any; listeners: any }) => React.ReactNode;
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
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={
        "border-b border-gray-100 last:border-none dark:border-gray-800 " +
        (isDragging ? "bg-blue-50/40 dark:bg-blue-950/20" : "")
      }
    >
      {/* ハンドル列 */}
      <td className="px-2 py-1 align-top">
        {handleProps({ attributes, listeners })}
      </td>

      {children}
    </tr>
  );
}

export default function CourseAdminClient({ schoolId }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null); // ✅ 行単位
  const [savingSort, setSavingSort] = useState(false); // ✅ 並び替え保存中
  const [error, setError] = useState<string | null>(null);

  // 新規追加
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  // ✅ sortOrderはUIから消すが、POST payloadのために値は保持（常に0でOK）
  const [newSortOrder, setNewSortOrder] = useState<number>(0);
  const [newIsActive, setNewIsActive] = useState(true);

  const [newQ2Tags, setNewQ2Tags] = useState<string[]>([]);
  const newQ2Handlers = useMemo(
    () => makeToggleSelectHandlers(newQ2Tags, setNewQ2Tags),
    [newQ2Tags]
  );

  const disabled = !schoolId;

  // ✅ dnd-kit sensors（誤爆防止に少し距離を持たせる）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

      // ✅ 表示は sortOrder 順に揃える（内部用）
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
          // ✅ UIでは編集しない（必要ならAPI側で末尾に自動採番にするのが理想）
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

    // 旧 sortOrder を保持して比較
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

    // UIは先に確定（optimistic）
    setCourses(
      nextList.map((c, idx) => ({
        ...c,
        sortOrder: idx + 1,
      }))
    );

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

      // 整合性担保
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
    <div className="space-y-6">
      {/* 新規追加 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          新しいコースを追加
        </h2>

        {/* ✅ sort入力を消したので3列に */}
        <div className="mb-2 grid gap-3 md:grid-cols-3">
          <input
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 placeholder:text-gray-400
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      disabled:opacity-50
                      dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder="コース名（例：初心者）"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            disabled={disabled || saving || savingSort}
          />
          <input
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 placeholder:text-gray-400
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      disabled:opacity-50
                      dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder="slug（例：beginner）"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            disabled={disabled || saving || savingSort}
          />
          <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={newIsActive}
              onChange={(e) => setNewIsActive(e.target.checked)}
              disabled={disabled || saving || savingSort}
            />
            有効
          </label>
        </div>

        {/* Q2 */}
        <div className="mb-3">
          <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
            Q2 対応（経験・運動レベル）※複数OK
          </div>
          <select
            multiple
            className="h-28 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       disabled:opacity-50
                       dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:[color-scheme:dark]"
            value={newQ2Handlers.value}
            onMouseDown={newQ2Handlers.onMouseDown}
            onChange={newQ2Handlers.onChange}
            disabled={disabled || saving || savingSort}
          >
            {Q2_OPTIONS.map((o) => (
              <option key={o.tag} value={o.tag}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            ※Cmd/Ctrl不要でクリックでON/OFFできます
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={disabled || saving || savingSort}
          className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white
                    hover:bg-blue-700 disabled:opacity-40"
        >
          {saving ? "保存中..." : "コースを追加"}
        </button>
      </div>

      {/* 一覧 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            コース一覧
          </h2>
          <div className="flex items-center gap-3">
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
          <div
            className="mb-3 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700
                          dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          >
            {error}
          </div>
        )}

        {courses.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            登録されているコースはありません。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={courseIds}
                strategy={verticalListSortingStrategy}
              >
                <table className="w-full min-w-[980px] text-left text-xs">
                  <thead>
                    <tr
                      className="border-b border-gray-200 bg-gray-50 text-[11px] text-gray-600
                              dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                    >
                      <th className="px-2 py-1 w-[44px]"> </th>
                      <th className="px-2 py-1">コース名</th>
                      <th className="px-2 py-1">slug</th>
                      {/* ✅ sort列を削除 */}
                      <th className="px-2 py-1">Q2対応（複数）</th>
                      <th className="px-2 py-1">有効</th>
                      <th className="px-2 py-1 text-right">操作</th>
                    </tr>
                  </thead>

                  <tbody>
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

                      const handlers = makeToggleSelectHandlers(
                        c.q2AnswerTags ?? [],
                        setRowSelected
                      );

                      const rowSaving = savingRowId === c.id;
                      const dndDisabled = saving || savingSort || rowSaving;

                      return (
                        <SortableTr
                          key={c.id}
                          id={c.id}
                          disabled={dndDisabled}
                          handleProps={({ attributes, listeners }) => (
                            <button
                              type="button"
                              className="cursor-grab select-none rounded-lg border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700
                                         hover:bg-gray-50 active:cursor-grabbing disabled:opacity-40
                                         dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                              aria-label="ドラッグして並び替え"
                              disabled={dndDisabled}
                              {...attributes}
                              {...listeners}
                            >
                              ☰
                            </button>
                          )}
                        >
                          <td className="px-2 py-1">
                            <input
                              className="w-full rounded border border-gray-300 bg-white px-1 py-0.5 text-gray-900
                                  focus:outline-none focus:ring-2 focus:ring-blue-500
                                  disabled:opacity-50
                                  dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
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
                          </td>

                          <td className="px-2 py-1">
                            <input
                              className="w-full rounded border border-gray-300 bg-white px-1 py-0.5 text-gray-900
                                   focus:outline-none focus:ring-2 focus:ring-blue-500
                                   disabled:opacity-50
                                   dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
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
                          </td>

                          {/* ✅ sort表示セルを削除 */}

                          <td className="px-2 py-1">
                            <select
                              multiple
                              className="h-24 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900
                                     focus:outline-none focus:ring-2 focus:ring-blue-500
                                     disabled:opacity-50
                                     dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:[color-scheme:dark]"
                              value={handlers.value}
                              onMouseDown={handlers.onMouseDown}
                              onChange={handlers.onChange}
                              disabled={saving || savingSort}
                            >
                              {Q2_OPTIONS.map((o) => (
                                <option key={o.tag} value={o.tag}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-2 py-1">
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
                          </td>

                          <td className="px-2 py-1 text-right whitespace-nowrap">
                            <button
                              onClick={() =>
                                handleUpdateField(
                                  c.id,
                                  "q2AnswerTags",
                                  uniqStrings(c.q2AnswerTags ?? [])
                                )
                              }
                              disabled={saving || savingSort || rowSaving}
                              className="mr-3 rounded-full border border-gray-300 bg-white px-3 py-1 text-[11px] font-semibold text-gray-800
                                     hover:bg-gray-50 disabled:opacity-40
                                     dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900"
                            >
                              {rowSaving ? "Q2保存中..." : "Q2保存"}
                            </button>

                            <button
                              onClick={() => handleDelete(c.id)}
                              className="text-[11px] text-red-600 underline hover:text-red-700
                                  disabled:opacity-40
                                  dark:text-red-300 dark:hover:text-red-200"
                              disabled={saving || savingSort || rowSaving}
                            >
                              削除
                            </button>
                          </td>
                        </SortableTr>
                      );
                    })}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>

            <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              ※ 並び替えは「☰」をドラッグ → ドロップで自動保存されます /
              Q2は「クリックでON/OFF」→
              右の「Q2保存」で保存されます（Cmd/Ctrl不要）
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
