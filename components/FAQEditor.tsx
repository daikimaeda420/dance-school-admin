// components/FAQEditor.tsx
"use client";

import { memo, useCallback, useState } from "react";
import type { FAQItem } from "../app/faq/page";

// 再帰的に構造を走査してマップを生成
function renderTree(item: FAQItem, path: string[] = []): string[] {
  const current = path.join(" > ") + "：" + item.question;
  if (item.type === "select") {
    return item.options
      .flatMap((opt, i) => renderTree(opt.next, [...path, `選択肢${i + 1}`]))
      .map((sub) => current + "\n├─ " + sub);
  }
  return [current];
}

export const FAQEditor = memo(function FAQEditor({
  item,
  path,
  onChange,
}: {
  item: FAQItem;
  path: (number | string)[];
  onChange: (path: (number | string)[], updated: FAQItem) => void;
}) {
  const [collapsedOptions, setCollapsedOptions] = useState<
    Record<number, boolean>
  >({});
  const [showPreview, setShowPreview] = useState(false);

  const toggleCollapse = (index: number) => {
    setCollapsedOptions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleInputChange = useCallback(
    (field: keyof FAQItem, value: string) => {
      onChange(path, { ...item, [field]: value });
    },
    [item, path, onChange]
  );

  const handleOptionChange = useCallback(
    (index: number, updatedOption: { label: string; next: FAQItem }) => {
      if (item.type !== "select") return;
      const updatedOptions = [...item.options];
      updatedOptions[index] = updatedOption;
      onChange(path, { ...item, options: updatedOptions });
    },
    [item, path, onChange]
  );

  const level = path.filter((p) => typeof p === "number").length;
  const labelPath = path
    .filter((p) => typeof p === "number")
    .map((n, i) =>
      i === 0
        ? String.fromCharCode(65 + (n as number))
        : `選択肢${(n as number) + 1}`
    )
    .join(" > ");

  return (
    <div className="border p-2 rounded mb-2">
      <div className="flex justify-between items-center mb-1">
        <select
          className="border p-1 rounded w-full mr-2"
          value={item.type}
          onChange={(e) =>
            onChange(path, {
              ...item,
              type: e.target.value as "question" | "select",
            })
          }
        >
          <option value="question">質問・回答</option>
          <option value="select">選択肢による分岐</option>
        </select>
        <div className="text-right text-xs text-gray-500 min-w-max">
          <div>階層: {level}</div>
          {labelPath && <div className="text-gray-400">📍 {labelPath}</div>}
        </div>
      </div>

      <input
        className="border p-1 rounded w-full mb-1"
        placeholder="質問文"
        value={item.question}
        onChange={(e) => handleInputChange("question", e.target.value)}
      />

      {item.type === "question" && (
        <>
          <textarea
            className="border p-1 rounded w-full mb-1"
            placeholder="回答"
            value={item.answer}
            onChange={(e) => handleInputChange("answer", e.target.value)}
          />
          <input
            className="border p-1 rounded w-full mb-1"
            placeholder="リンク先URL（省略可）"
            value={item.url ?? ""}
            onChange={(e) => handleInputChange("url", e.target.value)}
          />
        </>
      )}

      {item.type === "select" && (
        <div className="mb-2">
          <p className="text-sm text-gray-600 mb-1">選択肢：</p>
          {item.options?.map((opt, j) => (
            <div key={j} className="border p-2 rounded mb-2">
              <div className="flex justify-between items-center mb-1">
                <input
                  className="border p-1 rounded w-full mr-2"
                  placeholder="選択肢のラベル"
                  value={opt.label}
                  onChange={(e) =>
                    handleOptionChange(j, { ...opt, label: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => toggleCollapse(j)}
                  className="text-xs text-blue-500"
                >
                  {collapsedOptions[j] ? "▶ 展開" : "▼ 折りたたみ"}
                </button>
              </div>

              {!collapsedOptions[j] && (
                <FAQEditor
                  item={opt.next}
                  path={[...path, "options", j, "next"]}
                  onChange={onChange}
                />
              )}

              <button
                type="button"
                onClick={() => {
                  const updatedOptions = [...item.options];
                  updatedOptions.splice(j, 1);
                  onChange(path, { ...item, options: updatedOptions });
                }}
                className="text-red-500 text-sm"
              >
                ✕ 削除
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newOptions = [...(item.options || [])];
              newOptions.push({
                label: "",
                next: { type: "question", question: "", answer: "" },
              });
              onChange(path, { ...item, options: newOptions });
            }}
            className="text-blue-500 text-sm mt-1"
          >
            ＋ 選択肢を追加
          </button>
        </div>
      )}
    </div>
  );
});
