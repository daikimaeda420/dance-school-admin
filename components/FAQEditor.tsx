"use client";

import { useCallback } from "react";
import type { FAQItem } from "@/app/faq/page";

type Props = {
  item: FAQItem;
  path: (number | string)[];
  onChange: (path: (number | string)[], updated: FAQItem) => void;
  level?: number; // 0起点
};

/* 線を減らすためのスタイル */
const TINT = [
  "bg-amber-50",
  "bg-emerald-50",
  "bg-sky-50",
  "bg-rose-50",
  "bg-indigo-50",
];
const STRIPE = [
  "border-amber-300",
  "border-emerald-300",
  "border-sky-300",
  "border-rose-300",
  "border-indigo-300",
];
const levelWrap = (level = 0) =>
  level === 0
    ? ""
    : `rounded-lg ${TINT[level % TINT.length]} border-l-4 ${
        STRIPE[level % STRIPE.length]
      } pl-3 pr-3 py-3`;

function NodeHeader({
  level,
  type,
  onSwitch,
}: {
  level: number;
  type: "question" | "select";
  onSwitch: (t: "question" | "select") => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="text-xs font-semibold text-gray-600">
        Level {level + 1}
      </div>
      <div className="inline-flex rounded-full bg-gray-100 p-0.5">
        <button
          type="button"
          onClick={() => onSwitch("question")}
          className={`px-2 py-1 text-xs rounded-full ${
            type === "question" ? "bg-white shadow-sm" : "hover:bg-white/70"
          }`}
        >
          質問
        </button>
        <button
          type="button"
          onClick={() => onSwitch("select")}
          className={`px-2 py-1 text-xs rounded-full ${
            type === "select" ? "bg-white shadow-sm" : "hover:bg-white/70"
          }`}
        >
          選択肢
        </button>
      </div>
    </div>
  );
}

export function FAQEditor({ item, path, onChange, level = 0 }: Props) {
  const update = useCallback(
    (updated: FAQItem) => onChange(path, updated),
    [onChange, path]
  );

  /** タイプ切替（不変更新） */
  const switchType = (nextType: "question" | "select") => {
    if (nextType === item.type) return;

    if (nextType === "select" && item.type === "question") {
      update({
        type: "select",
        question: item.question,
        answer: item.answer ?? "",
        options: [
          { label: "", next: { type: "question", question: "", answer: "" } },
        ],
      });
      return;
    }
    if (nextType === "question" && item.type === "select") {
      if (!confirm("選択肢は削除されます。質問に変換しますか？")) return;
      update({
        type: "question",
        question: item.question,
        answer: item.answer ?? "",
      });
    }
  };

  if (item.type === "question") {
    return (
      <div className={levelWrap(level)}>
        <NodeHeader level={level} type="question" onSwitch={switchType} />

        <div className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm text-gray-700">質問</label>
            <input
              className="input"
              value={item.question}
              onChange={(e) => update({ ...item, question: e.target.value })}
              placeholder="質問文"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-gray-700">回答</label>
            <textarea
              className="input"
              rows={3}
              value={item.answer}
              onChange={(e) => update({ ...item, answer: e.target.value })}
              placeholder="回答テキスト"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-gray-700">リンクURL（任意）</label>
            <input
              className="input"
              value={item.url ?? ""}
              onChange={(e) => update({ ...item, url: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
        </div>
      </div>
    );
  }

  // === select ===
  return (
    <div className={levelWrap(level)}>
      <NodeHeader level={level} type="select" onSwitch={switchType} />

      <div className="space-y-4">
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">質問</label>
          <input
            className="input"
            value={item.question}
            onChange={(e) => update({ ...item, question: e.target.value })}
            placeholder="質問文（分岐の親）"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-gray-700">
            選択後の案内文（任意）
          </label>
          <input
            className="input"
            value={item.answer ?? ""}
            onChange={(e) => update({ ...item, answer: e.target.value })}
            placeholder="（例）下の選択肢から選んでください"
          />
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-700">選択肢</div>

          {item.options.map((opt, idx) => (
            <div key={idx} className={levelWrap(level + 1)}>
              <div className="grid gap-2">
                <label className="text-sm text-gray-700">
                  ラベル（Level {level + 2}）
                </label>
                <input
                  className="input"
                  value={opt.label}
                  onChange={(e) =>
                    update({
                      ...item,
                      options: item.options.map((o, j) =>
                        j === idx ? { ...o, label: e.target.value } : o
                      ),
                    })
                  }
                  placeholder="（例）キッズ"
                />
              </div>

              <div className="mt-3">
                {/* 子ノード（不変更新は子側が行うのでここはそのまま） */}
                <FAQEditor
                  item={opt.next}
                  path={[...path, "options", idx, "next"]}
                  onChange={onChange}
                  level={level + 1}
                />
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={() =>
                    update({
                      ...item,
                      options: item.options.filter((_, j) => j !== idx),
                    })
                  }
                >
                  この選択肢を削除
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="btn-ghost"
            onClick={() =>
              update({
                ...item,
                options: [
                  ...item.options,
                  {
                    label: "",
                    next: { type: "question", question: "", answer: "" },
                  },
                ],
              })
            }
          >
            ＋ 選択肢を追加
          </button>
        </div>
      </div>
    </div>
  );
}
