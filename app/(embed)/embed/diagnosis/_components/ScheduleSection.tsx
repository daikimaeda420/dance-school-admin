"use client";

import { useState } from "react";

type PublicScheduleSlot = {
  id: string;
  genreText: string;
  timeText: string;
  teacher: string;
  place: string;
};

type PublicSchedule = Record<
  "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN",
  PublicScheduleSlot[]
>;

type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
type ViewDayKey = DayKey | "ALL";

const dayKeys: DayKey[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const viewDayLabel: Record<DayKey, string> = {
  MON: "月",
  TUE: "火",
  WED: "水",
  THU: "木",
  FRI: "金",
  SAT: "土",
  SUN: "日",
};

type Props = {
  schedule: PublicSchedule | null;
  scheduleError: string | null;
  scheduleDay: DayKey;
  onScheduleDayChange: (day: DayKey) => void;
};

export default function ScheduleSection({
  schedule,
  scheduleError,
  scheduleDay,
  onScheduleDayChange,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewDayKey>(scheduleDay);

  const s = schedule;
  const total = s
    ? (Object.values(s).reduce(
        (sum, arr) => sum + arr.length,
        0,
      ) as number)
    : 0;

  // 選択曜日変更（「全て」以外は親にも通知）
  const handleDayClick = (key: ViewDayKey) => {
    setViewMode(key);
    if (key !== "ALL") {
      onScheduleDayChange(key as DayKey);
    }
  };

  // 表示するリストを構築
  const displayGroups: { day: DayKey; slots: (PublicScheduleSlot & { weekday: DayKey })[] }[] =
    viewMode === "ALL"
      ? dayKeys
          .map((k) => ({
            day: k,
            slots: (s?.[k] ?? []).map((slot) => ({ ...slot, weekday: k })),
          }))
          .filter((g) => g.slots.length > 0)
      : (() => {
          const slots = (s?.[viewMode as DayKey] ?? []).map((slot) => ({
            ...slot,
            weekday: viewMode as DayKey,
          }));
          return [{ day: viewMode as DayKey, slots }];
        })();

  return (
    <div className="rounded-[28px] bg-white px-5 py-6 shadow-sm ring-1 ring-black/5">
      <div className="text-center">
        <div className="text-[26px] font-extrabold tracking-wide text-[#6b4a2b]">
          スケジュール
        </div>
        <div className="mt-1 text-[12px] font-semibold tracking-[0.2em] text-[#6b4a2b]/70">
          SCHEDULE
        </div>
        <div className="mx-auto mt-6 h-px w-full bg-[#6b4a2b]/10" />
      </div>

      {scheduleError && (
        <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[11px] text-red-600">
          {scheduleError}
        </div>
      )}

      {!s || total === 0 ? (
        <div className="mt-4 rounded-2xl bg-white p-5 text-center text-[12px] font-semibold text-[#6b4a2b]/70 ring-1 ring-[#6b4a2b]/10">
          現在、該当するスケジュールはありません。
        </div>
      ) : (
        <>
          {/* 曜日タブ（全て + 月〜日） */}
          <div className="mt-6 grid grid-cols-4 gap-3">
            {/* 全てボタン */}
            <button
              onClick={() => handleDayClick("ALL")}
              className={[
                "h-11 rounded-full text-[14px] font-bold",
                "transition active:scale-[0.99]",
                "shadow-[0_8px_16px_rgba(0,0,0,0.08)]",
                viewMode === "ALL"
                  ? "bg-[#f6c400] text-[#6b4a2b]"
                  : "bg-white text-[#6b4a2b] ring-1 ring-[#6b4a2b]/10",
              ].join(" ")}
            >
              全て
            </button>
            {dayKeys.map((k) => (
              <button
                key={k}
                onClick={() => handleDayClick(k)}
                className={[
                  "h-11 rounded-full text-[14px] font-bold",
                  "transition active:scale-[0.99]",
                  "shadow-[0_8px_16px_rgba(0,0,0,0.08)]",
                  viewMode === k
                    ? "bg-[#f6c400] text-[#6b4a2b]"
                    : "bg-white text-[#6b4a2b] ring-1 ring-[#6b4a2b]/10",
                ].join(" ")}
              >
                {viewDayLabel[k]}
              </button>
            ))}
          </div>

          {/* スケジュール表示 */}
          <div className="mt-6 space-y-6">
            {displayGroups.length === 0 ? (
              <div className="rounded-2xl bg-white p-5 text-center text-[12px] font-semibold text-[#6b4a2b]/70 ring-1 ring-[#6b4a2b]/10">
                該当するスケジュールがありません
              </div>
            ) : (
              displayGroups.map(({ day, slots }) => (
                <div key={day}>
                  {/* 全て表示時のみ曜日ヘッダーを表示 */}
                  {viewMode === "ALL" && (
                    <div className="mb-3 flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-[#f6c400] text-[13px] font-extrabold text-[#6b4a2b]">
                        {viewDayLabel[day]}
                      </div>
                      <div className="h-px flex-1 bg-[#6b4a2b]/10" />
                    </div>
                  )}
                  <div className="space-y-4">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className={[
                          "rounded-2xl bg-white p-5",
                          "ring-1 ring-[#6b4a2b]/10",
                          "shadow-[0_10px_24px_rgba(0,0,0,0.08)]",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-5 w-1.5 rounded-full bg-[#d9d2c7]" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[18px] font-extrabold text-[#6b4a2b]">
                              {slot.genreText}コース
                            </div>
                            <div className="mt-3 space-y-2 text-[14px] font-semibold text-[#6b4a2b]/85">
                              <div className="flex items-center gap-2">
                                <span className="text-[#b8a99a]">🕒</span>
                                <span className="truncate">{slot.timeText}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[#b8a99a]">👤</span>
                                <span className="truncate">{slot.teacher}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[#b8a99a]">📍</span>
                                <span className="truncate">{slot.place}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
