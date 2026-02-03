// app/admin/diagnosis/schedule/ScheduleAdminClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Props = { initialSchoolId?: string };

type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

type CourseRow = {
  id: string;
  label: string;
  isActive?: boolean;
};

type SlotRow = {
  id: string;
  schoolId: string;
  weekday: Weekday;
  genreText: string;
  timeText: string;
  teacher: string;
  place: string;
  sortOrder: number;
  isActive: boolean;
  courseIds: string[];
};

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: "MON", label: "月" },
  { key: "TUE", label: "火" },
  { key: "WED", label: "水" },
  { key: "THU", label: "木" },
  { key: "FRI", label: "金" },
  { key: "SAT", label: "土" },
  { key: "SUN", label: "日" },
];

// ---- UI classes（ダークモードをしっかり整える） ----
const card =
  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm " +
  "text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100";

const input =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm " +
  "text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 " +
  "dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500";

const select =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm " +
  "text-gray-900 outline-none focus:border-blue-500 " +
  "dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

const label = "text-xs font-semibold text-gray-600 dark:text-gray-300";

const btn =
  "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold " +
  "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 " +
  "dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900";

const btnPrimary =
  "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold " +
  "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50";

const btnDanger =
  "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold " +
  "border border-red-200 bg-white text-red-600 hover:bg-red-50 " +
  "dark:border-red-900/40 dark:bg-gray-950 dark:hover:bg-red-950/30";

const badge =
  "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold " +
  "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-100";

// -----------------------
// ✅ Fetch エラーを必ず拾う（JSON/テキスト/HTML どれでも）
// -----------------------
async function readBodyText(res: Response) {
  return await res.text().catch(() => "");
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function assertOk(res: Response, actionLabel: string) {
  if (res.ok) return;

  const raw = await readBodyText(res);
  const j = safeJsonParse(raw);

  const msg =
    String(j?.message ?? j?.error ?? "") || raw?.slice(0, 300) || "詳細不明";

  throw new Error(`${actionLabel}に失敗しました（${res.status}）: ${msg}`);
}

async function readJsonFlexible(res: Response) {
  const raw = await readBodyText(res);
  const j = safeJsonParse(raw);
  if (!j) {
    throw new Error(
      `レスポンスがJSONではありません: ${raw?.slice(0, 300) || "(空)"}`,
    );
  }
  return j;
}

// -----------------------
function arrayMove<T>(arr: T[], from: number, to: number) {
  const a = arr.slice();
  const [item] = a.splice(from, 1);
  a.splice(to, 0, item);
  return a;
}

export default function ScheduleAdminClient({ initialSchoolId }: Props) {
  const searchParams = useSearchParams();

  const schoolId = useMemo(() => {
    return (
      initialSchoolId ||
      searchParams.get("schoolId") ||
      searchParams.get("school") ||
      ""
    );
  }, [initialSchoolId, searchParams]);

  const [activeDay, setActiveDay] = useState<Weekday>("MON");

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 追加フォーム
  const [newSlot, setNewSlot] = useState<Omit<SlotRow, "id">>({
    schoolId: "",
    weekday: "MON",
    genreText: "",
    timeText: "",
    teacher: "",
    place: "",
    sortOrder: 0,
    isActive: true,
    courseIds: [],
  });

  // ---- DnD state ----
  const dragFromIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // schoolId が変わったら初期化
  useEffect(() => {
    setActiveDay("MON");
    setSlots([]);
    setCourses([]);
    setError(null);
    setNewSlot((p) => ({
      ...p,
      schoolId: schoolId,
      courseIds: [],
      weekday: "MON",
    }));
  }, [schoolId]);

  // データ取得
  useEffect(() => {
    if (!schoolId) return;

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // コース
        const courseRes = await fetch(
          `/api/admin/diagnosis/courses?schoolId=${encodeURIComponent(schoolId)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        await assertOk(courseRes, "コース取得");
        const courseJson = await readJsonFlexible(courseRes);

        // schedule slots
        const slotRes = await fetch(
          `/api/admin/diagnosis/schedule-slots?schoolId=${encodeURIComponent(
            schoolId,
          )}`,
          { signal: controller.signal, cache: "no-store" },
        );
        await assertOk(slotRes, "スケジュール取得");
        const slotJson = await readJsonFlexible(slotRes);

        if (cancelled) return;

        // courses API の返し方が {courses:[...]} / [...] どっちでも吸収
        const courseList: any[] = Array.isArray(courseJson)
          ? courseJson
          : Array.isArray(courseJson?.courses)
            ? courseJson.courses
            : Array.isArray(courseJson?.items)
              ? courseJson.items
              : [];

        setCourses(
          courseList
            .map((c) => ({
              id: String(c.id),
              label: String(c.label ?? c.name ?? ""),
              isActive: c.isActive ?? true,
            }))
            .filter((c) => c.id && c.label),
        );

        const slotList: any[] = Array.isArray(slotJson)
          ? slotJson
          : Array.isArray(slotJson?.slots)
            ? slotJson.slots
            : [];

        setSlots(
          slotList.map((s) => ({
            id: String(s.id),
            schoolId: String(s.schoolId),
            weekday: String(s.weekday) as Weekday,
            genreText: String(s.genreText ?? ""),
            timeText: String(s.timeText ?? ""),
            teacher: String(s.teacher ?? ""),
            place: String(s.place ?? ""),
            sortOrder: Number(s.sortOrder ?? 0),
            isActive: Boolean(s.isActive ?? true),
            courseIds: Array.isArray(s.courseIds)
              ? s.courseIds.map(String)
              : [],
          })),
        );

        setNewSlot((p) => ({ ...p, schoolId }));
      } catch (e) {
        if (cancelled) return;
        if ((e as any)?.name === "AbortError") return;
        console.error(e);
        setError((e as any)?.message ?? "読み込みに失敗しました");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [schoolId]);

  const slotsByDay = useMemo(() => {
    const map: Record<Weekday, SlotRow[]> = {
      MON: [],
      TUE: [],
      WED: [],
      THU: [],
      FRI: [],
      SAT: [],
      SUN: [],
    };
    for (const s of slots) map[s.weekday]?.push(s);
    for (const d of Object.keys(map) as Weekday[]) {
      map[d].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    return map;
  }, [slots]);

  const activeSlots = slotsByDay[activeDay] ?? [];

  function updateSlotLocal(id: string, patch: Partial<SlotRow>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function toggleCourse(list: string[], courseId: string) {
    const set = new Set(list);
    if (set.has(courseId)) set.delete(courseId);
    else set.add(courseId);
    return Array.from(set);
  }

  const activeCourses = useMemo(() => {
    return courses.slice().sort((a, b) => a.label.localeCompare(b.label, "ja"));
  }, [courses]);

  async function saveSlot(id: string) {
    const slot = slots.find((s) => s.id === id);
    if (!slot) return;

    if (
      !slot.genreText.trim() ||
      !slot.timeText.trim() ||
      !slot.teacher.trim() ||
      !slot.place.trim()
    ) {
      setError("ジャンル / 時間 / 講師 / 場所 は必須です");
      return;
    }
    if (!slot.courseIds?.length) {
      setError("対応コースを1つ以上選択してください");
      return;
    }

    setSavingId(id);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/diagnosis/schedule-slots/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weekday: slot.weekday,
            genreText: slot.genreText,
            timeText: slot.timeText,
            teacher: slot.teacher,
            place: slot.place,
            sortOrder: slot.sortOrder,
            isActive: slot.isActive,
            courseIds: slot.courseIds,
          }),
        },
      );
      await assertOk(res, "保存");

      const data = await readJsonFlexible(res);
      const saved = data?.slot ?? data;
      if (saved?.id) {
        updateSlotLocal(id, {
          weekday: saved.weekday,
          genreText: saved.genreText,
          timeText: saved.timeText,
          teacher: saved.teacher,
          place: saved.place,
          sortOrder: Number(saved.sortOrder ?? slot.sortOrder),
          isActive: Boolean(saved.isActive ?? slot.isActive),
          courseIds: Array.isArray(saved.courseIds)
            ? saved.courseIds
            : slot.courseIds,
        });
      }
    } catch (e) {
      console.error(e);
      setError((e as any)?.message ?? "保存に失敗しました");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteSlot(id: string) {
    if (!confirm("この枠を削除（非表示）しますか？")) return;

    setSavingId(id);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/diagnosis/schedule-slots/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      await assertOk(res, "削除");

      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error(e);
      setError((e as any)?.message ?? "削除に失敗しました");
    } finally {
      setSavingId(null);
    }
  }

  async function createSlot() {
    if (!schoolId) {
      setError("schoolId が指定されていません（URL ?schoolId=xxx）");
      return;
    }

    const p = newSlot;

    if (
      !p.genreText.trim() ||
      !p.timeText.trim() ||
      !p.teacher.trim() ||
      !p.place.trim()
    ) {
      setError("ジャンル / 時間 / 講師 / 場所 は必須です");
      return;
    }
    if (!p.courseIds?.length) {
      setError("対応コースを1つ以上選択してください");
      return;
    }

    setSavingId("NEW");
    setError(null);

    try {
      const res = await fetch(`/api/admin/diagnosis/schedule-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          weekday: p.weekday,
          genreText: p.genreText,
          timeText: p.timeText,
          teacher: p.teacher,
          place: p.place,
          sortOrder: p.sortOrder ?? 0,
          isActive: p.isActive ?? true,
          courseIds: p.courseIds,
        }),
      });

      await assertOk(res, "追加");
      const data = await readJsonFlexible(res);

      // { slot: {...} } / {...} どっちでも吸う
      const created = data?.slot ?? data;
      if (!created?.id) {
        throw new Error(
          `追加に失敗しました（slot.idが返りません）: ${JSON.stringify(
            data,
          ).slice(0, 300)}`,
        );
      }

      setSlots((prev) => [
        ...prev,
        {
          id: String(created.id),
          schoolId,
          weekday: created.weekday as Weekday,
          genreText: String(created.genreText ?? ""),
          timeText: String(created.timeText ?? ""),
          teacher: String(created.teacher ?? ""),
          place: String(created.place ?? ""),
          sortOrder: Number(created.sortOrder ?? 0),
          isActive: Boolean(created.isActive ?? true),
          courseIds: Array.isArray(created.courseIds)
            ? created.courseIds.map(String)
            : [],
        },
      ]);

      setNewSlot((prev) => ({
        ...prev,
        genreText: "",
        timeText: "",
        teacher: "",
        place: "",
        sortOrder: (prev.sortOrder ?? 0) + 1,
        courseIds: [],
      }));
    } catch (e) {
      console.error(e);
      setError((e as any)?.message ?? "追加に失敗しました");
    } finally {
      setSavingId(null);
    }
  }

  // ---- D&D: 並び替え → sortOrderを付け替えて保存 ----
  async function persistOrderForActiveDay(ordered: SlotRow[]) {
    const withOrder = ordered.map((s, idx) => ({
      ...s,
      sortOrder: idx,
    }));

    setSlots((prev) =>
      prev.map((x) => {
        const hit = withOrder.find((w) => w.id === x.id);
        return hit ? { ...x, sortOrder: hit.sortOrder } : x;
      }),
    );

    setSavingId("REORDER");
    setError(null);

    try {
      // ✅ ここも assertOk で詳細出す
      await Promise.all(
        withOrder.map(async (s) => {
          const r = await fetch(
            `/api/admin/diagnosis/schedule-slots/${encodeURIComponent(s.id)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sortOrder: s.sortOrder }),
            },
          );
          await assertOk(r, "並び順保存");
        }),
      );
    } catch (e) {
      console.error(e);
      setError((e as any)?.message ?? "並び順の保存に失敗しました");
    } finally {
      setSavingId(null);
    }
  }

  function onDragStart(id: string) {
    dragFromIdRef.current = id;
    setDraggingId(id);
  }

  function onDragEnd() {
    dragFromIdRef.current = null;
    setDraggingId(null);
  }

  function onDrop(toId: string) {
    const fromId = dragFromIdRef.current;
    if (!fromId || fromId === toId) return;

    const ordered = activeSlots.slice();
    const fromIndex = ordered.findIndex((x) => x.id === fromId);
    const toIndex = ordered.findIndex((x) => x.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const moved = arrayMove(ordered, fromIndex, toIndex);
    void persistOrderForActiveDay(moved);
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className={card}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-extrabold">スケジュール管理</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              曜日ごとに枠を作り、対応コース（チェックボックス）を紐付けてください。
              <span className="ml-2">
                並び順は{" "}
                <span className="font-semibold">ドラッグ＆ドロップ</span>{" "}
                で変更できます。
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            schoolId:{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {schoolId || "(未指定)"}
            </span>
          </div>
        </div>

        {!schoolId && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-200">
            URL に <span className="font-semibold">?schoolId=xxx</span>{" "}
            が必要です。
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        {savingId === "REORDER" && (
          <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
            並び順を保存しています...
          </div>
        )}
      </div>

      {/* 曜日タブ */}
      <div className={card}>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => {
            const active = d.key === activeDay;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setActiveDay(d.key)}
                className={[
                  "rounded-xl px-3 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-blue-600 text-white"
                    : "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 " +
                      "dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900",
                ].join(" ")}
              >
                {d.label}
                <span className={badge}>{slotsByDay[d.key]?.length ?? 0}</span>
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            読み込み中...
          </div>
        )}
      </div>

      {/* 追加フォーム */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">枠を追加</div>
          <button
            type="button"
            onClick={createSlot}
            className={btnPrimary}
            disabled={!schoolId || savingId === "NEW" || savingId === "REORDER"}
          >
            {savingId === "NEW" ? "追加中..." : "追加する"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <div className={label}>曜日</div>
            <select
              className={select}
              value={newSlot.weekday}
              onChange={(e) =>
                setNewSlot((p) => ({
                  ...p,
                  weekday: e.target.value as Weekday,
                }))
              }
              disabled={savingId === "REORDER"}
            >
              {WEEKDAYS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className={label}>表示順（小さいほど上）</div>
            <input
              className={input}
              type="number"
              value={newSlot.sortOrder}
              onChange={(e) =>
                setNewSlot((p) => ({
                  ...p,
                  sortOrder: Number(e.target.value || 0),
                }))
              }
              disabled={savingId === "REORDER"}
            />
          </div>

          <div>
            <div className={label}>ジャンル（例：K-POP）</div>
            <input
              className={input}
              value={newSlot.genreText}
              onChange={(e) =>
                setNewSlot((p) => ({ ...p, genreText: e.target.value }))
              }
              disabled={savingId === "REORDER"}
            />
          </div>

          <div>
            <div className={label}>時間（例：15:00〜17:00）</div>
            <input
              className={input}
              value={newSlot.timeText}
              onChange={(e) =>
                setNewSlot((p) => ({ ...p, timeText: e.target.value }))
              }
              disabled={savingId === "REORDER"}
            />
          </div>

          <div>
            <div className={label}>講師（例：AYAKA）</div>
            <input
              className={input}
              value={newSlot.teacher}
              onChange={(e) =>
                setNewSlot((p) => ({ ...p, teacher: e.target.value }))
              }
              disabled={savingId === "REORDER"}
            />
          </div>

          <div>
            <div className={label}>場所（例：大阪校）</div>
            <input
              className={input}
              value={newSlot.place}
              onChange={(e) =>
                setNewSlot((p) => ({ ...p, place: e.target.value }))
              }
              disabled={savingId === "REORDER"}
            />
          </div>
        </div>

        <div className="mt-4">
          <div className={label}>対応コース（1つ以上チェック）</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {activeCourses.length === 0 ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                コースがありません（先にコースを作成してください）
              </div>
            ) : (
              activeCourses.map((c) => {
                const checked = newSlot.courseIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setNewSlot((p) => ({
                          ...p,
                          courseIds: toggleCourse(p.courseIds, c.id),
                        }))
                      }
                      disabled={savingId === "REORDER"}
                    />
                    <span className="min-w-0 truncate">{c.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
          ヒント：同じ枠を複数コースに紐付けたい場合は、複数チェックOKです。
        </div>
      </div>

      {/* 一覧（アクティブ曜日） */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">
            {WEEKDAYS.find((d) => d.key === activeDay)?.label} の枠
            <span className="ml-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              （カード左の「≡」をドラッグで並び替え）
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {activeSlots.length} 件
          </div>
        </div>

        {activeSlots.length === 0 ? (
          <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            まだ枠がありません。「枠を追加」から作成してください。
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {activeSlots.map((s) => (
              <div
                key={s.id}
                className={[
                  "rounded-2xl border p-4 transition",
                  "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950",
                  draggingId === s.id ? "opacity-60" : "opacity-100",
                ].join(" ")}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(s.id)}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      title="ドラッグして並び替え"
                      className={[
                        "select-none rounded-lg border px-2 py-1 text-sm font-bold",
                        "border-gray-200 bg-gray-50 text-gray-700",
                        "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200",
                        "cursor-grab active:cursor-grabbing",
                      ].join(" ")}
                      draggable
                      onDragStart={() => onDragStart(s.id)}
                      onDragEnd={onDragEnd}
                    >
                      ≡
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-extrabold">
                        {s.genreText || "(未入力)"} / {s.timeText || "(未入力)"}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        sortOrder: {s.sortOrder}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btn}
                      onClick={() => saveSlot(s.id)}
                      disabled={savingId === s.id || savingId === "REORDER"}
                    >
                      {savingId === s.id ? "保存中..." : "保存"}
                    </button>

                    <button
                      type="button"
                      className={btnDanger}
                      onClick={() => deleteSlot(s.id)}
                      disabled={savingId === s.id || savingId === "REORDER"}
                    >
                      削除
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className={label}>曜日</div>
                    <select
                      className={select}
                      value={s.weekday}
                      onChange={(e) =>
                        updateSlotLocal(s.id, {
                          weekday: e.target.value as Weekday,
                        })
                      }
                      disabled={savingId === "REORDER"}
                    >
                      {WEEKDAYS.map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className={label}>表示順（数値で直接変更）</div>
                    <input
                      className={input}
                      type="number"
                      value={s.sortOrder}
                      onChange={(e) =>
                        updateSlotLocal(s.id, {
                          sortOrder: Number(e.target.value || 0),
                        })
                      }
                      disabled={savingId === "REORDER"}
                    />
                  </div>

                  <div>
                    <div className={label}>ジャンル</div>
                    <input
                      className={input}
                      value={s.genreText}
                      onChange={(e) =>
                        updateSlotLocal(s.id, { genreText: e.target.value })
                      }
                      disabled={savingId === "REORDER"}
                    />
                  </div>

                  <div>
                    <div className={label}>時間</div>
                    <input
                      className={input}
                      value={s.timeText}
                      onChange={(e) =>
                        updateSlotLocal(s.id, { timeText: e.target.value })
                      }
                      disabled={savingId === "REORDER"}
                    />
                  </div>

                  <div>
                    <div className={label}>講師</div>
                    <input
                      className={input}
                      value={s.teacher}
                      onChange={(e) =>
                        updateSlotLocal(s.id, { teacher: e.target.value })
                      }
                      disabled={savingId === "REORDER"}
                    />
                  </div>

                  <div>
                    <div className={label}>場所</div>
                    <input
                      className={input}
                      value={s.place}
                      onChange={(e) =>
                        updateSlotLocal(s.id, { place: e.target.value })
                      }
                      disabled={savingId === "REORDER"}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className={label}>対応コース</div>

                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={s.isActive}
                        onChange={() =>
                          updateSlotLocal(s.id, { isActive: !s.isActive })
                        }
                        disabled={savingId === "REORDER"}
                      />
                      有効（結果に表示）
                    </label>
                  </div>

                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {activeCourses.map((c) => {
                      const checked = s.courseIds.includes(c.id);
                      return (
                        <label
                          key={`${s.id}_${c.id}`}
                          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              updateSlotLocal(s.id, {
                                courseIds: toggleCourse(s.courseIds, c.id),
                              })
                            }
                            disabled={savingId === "REORDER"}
                          />
                          <span className="min-w-0 truncate">{c.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    ※「保存」を押すまでDBには反映されません（並び替えはドロップ時に自動保存）。
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
