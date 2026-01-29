// app/admin/diagnosis/schedule/ScheduleAdminClient.tsx
"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
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

const card =
  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm " +
  "dark:border-gray-800 dark:bg-gray-900";

const input =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm " +
  "outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950";

const label = "text-xs font-semibold text-gray-600 dark:text-gray-300";

const btn =
  "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold " +
  "border border-gray-200 bg-white hover:bg-gray-50 " +
  "dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-900";

const btnPrimary =
  "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold " +
  "bg-blue-600 text-white hover:bg-blue-700";

const btnDanger =
  "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold " +
  "border border-red-200 bg-white text-red-600 hover:bg-red-50 " +
  "dark:border-red-900/40 dark:bg-gray-950 dark:hover:bg-red-950/30";

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
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
        if (!courseRes.ok) {
          const t = await courseRes.text();
          throw new Error(t || "コースの取得に失敗しました");
        }
        const courseJson = await courseRes.json();

        // schedule slots
        const slotRes = await fetch(
          `/api/admin/diagnosis/schedule-slots?schoolId=${encodeURIComponent(schoolId)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!slotRes.ok) {
          const t = await slotRes.text();
          throw new Error(t || "スケジュールの取得に失敗しました");
        }
        const slotJson = await slotRes.json();

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
        setError(
          "読み込みに失敗しました。権限・schoolId・API を確認してください。",
        );
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

  async function saveSlot(id: string) {
    const slot = slots.find((s) => s.id === id);
    if (!slot) return;

    // バリデーション（最低限）
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

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "保存に失敗しました");
      }

      const data = await res.json();
      const saved = data?.slot;
      if (saved?.id) {
        // APIの返しを正として同期
        updateSlotLocal(id, {
          weekday: saved.weekday,
          genreText: saved.genreText,
          timeText: saved.timeText,
          teacher: saved.teacher,
          place: saved.place,
          sortOrder: saved.sortOrder,
          isActive: saved.isActive,
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
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "削除に失敗しました");
      }

      // 論理削除想定：一覧からは消す（運用上見やすい）
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

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "追加に失敗しました");
      }

      const data = await res.json();
      const created = data?.slot;
      if (!created?.id) throw new Error("追加に失敗しました（IDが返りません）");

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

      // 連続入力しやすいように、曜日はそのままでフォームだけクリア
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

  function toggleCourse(list: string[], courseId: string) {
    const set = new Set(list);
    if (set.has(courseId)) set.delete(courseId);
    else set.add(courseId);
    return Array.from(set);
  }

  const activeCourses = useMemo(() => {
    // isActive を返さないAPIもあるので、念のため全件表示
    return courses.slice().sort((a, b) => a.label.localeCompare(b.label, "ja"));
  }, [courses]);

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className={card}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-extrabold">スケジュール管理</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              曜日ごとに枠を作り、対応コース（チェックボックス）を紐付けてください。
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            schoolId:{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
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
                    : "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900",
                ].join(" ")}
              >
                {d.label}
                <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs font-bold">
                  {slotsByDay[d.key]?.length ?? 0}
                </span>
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
            disabled={!schoolId || savingId === "NEW"}
          >
            {savingId === "NEW" ? "追加中..." : "追加する"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <div className={label}>曜日</div>
            <select
              className={input}
              value={newSlot.weekday}
              onChange={(e) =>
                setNewSlot((p) => ({
                  ...p,
                  weekday: e.target.value as Weekday,
                }))
              }
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
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
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
                className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm font-extrabold">
                    {s.genreText || "(未入力)"} / {s.timeText || "(未入力)"}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btn}
                      onClick={() => saveSlot(s.id)}
                      disabled={savingId === s.id}
                    >
                      {savingId === s.id ? "保存中..." : "保存"}
                    </button>

                    <button
                      type="button"
                      className={btnDanger}
                      onClick={() => deleteSlot(s.id)}
                      disabled={savingId === s.id}
                    >
                      削除
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className={label}>曜日</div>
                    <select
                      className={input}
                      value={s.weekday}
                      onChange={(e) =>
                        updateSlotLocal(s.id, {
                          weekday: e.target.value as Weekday,
                        })
                      }
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
                      value={s.sortOrder}
                      onChange={(e) =>
                        updateSlotLocal(s.id, {
                          sortOrder: Number(e.target.value || 0),
                        })
                      }
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
                          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              updateSlotLocal(s.id, {
                                courseIds: toggleCourse(s.courseIds, c.id),
                              })
                            }
                          />
                          <span className="min-w-0 truncate">{c.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    ※ 「保存」を押すまでDBには反映されません。
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
