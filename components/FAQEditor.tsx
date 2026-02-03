// components/FAQEditor.tsx
"use client";

import { useCallback, useState } from "react";
import type { FAQItem } from "@/app/(app)/faq/page";
import { ChevronDown, Copy, Trash2, ArrowUp, ArrowDown } from "lucide-react";

type Props = {
  item: FAQItem;
  path: (number | string)[];
  onChange: (path: (number | string)[], updated: FAQItem) => void;
  level?: number; // 0 起点
  hasError?: (path: (number | string)[], field: string) => boolean;
  breadcrumb?: string[]; // パンくず（選択肢ラベル）
  /** ★ 追加: 枠線なしで囲う（内側のボーダーを消す用） */
  naked?: boolean;
};

/** ★ 変更: 枠線あり/なしを切替できるラッパー */
/** 枠線あり/なしで padding を切替 */
const levelWrap = (level = 0, bordered = true) => {
  if (level === 0) return "";

  const cls = ["rounded-md", "bg-gray-50", "dark:bg-gray-900/40"];

  if (bordered) {
    // 枠線あり → padding なし
    cls.push("border", "border-gray-300", "dark:border-gray-600");
  } else {
    // 枠線なし（naked） → p-3 を付与
    cls.push("p-3");
  }

  return cls.join(" ");
};

const nodeId = (path: (number | string)[]) =>
  `node-` + path.map(String).join("-");

/** ヘッダー（Level 表示 + タイプ切替 + パンくず） */
function NodeHeader({
  level,
  type,
  onSwitch,
  breadcrumb = [],
}: {
  level: number;
  type: "question" | "select";
  onSwitch: (t: "question" | "select") => void;
  breadcrumb?: string[];
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-200">
          Level {level + 1}
        </div>
        {breadcrumb.length > 0 && (
          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            {breadcrumb.filter(Boolean).join(" › ")}
          </div>
        )}
      </div>

      <div className="inline-flex rounded-full bg-gray-100 p-0.5 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => onSwitch("question")}
          className={`px-3 py-1 text-xs rounded-full
            text-gray-800 dark:text-gray-100
            ${
              type === "question"
                ? "bg-white shadow-sm dark:bg-gray-700"
                : "hover:bg-white/70 dark:hover:bg-gray-700/70"
            }`}
        >
          質問
        </button>
        <button
          type="button"
          onClick={() => onSwitch("select")}
          className={`px-3 py-1 text-xs rounded-full
            text-gray-800 dark:text-gray-100
            ${
              type === "select"
                ? "bg-white shadow-sm dark:bg-gray-700"
                : "hover:bg-white/70 dark:hover:bg-gray-700/70"
            }`}
        >
          選択肢
        </button>
      </div>
    </div>
  );
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-sm text-gray-700 dark:text-gray-200">{children}</label>
);

const RequiredBadge = () => (
  <span className="ml-2 rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-700 px-1.5 py-0.5 text-[10px]">
    必須
  </span>
);

/** アコーディオン風の選択肢ヘッダー */
function OptionHeader({
  idx,
  label,
  onChangeLabel,
  onToggle,
  opened,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  showError,
}: {
  idx: number;
  label: string;
  onChangeLabel: (v: string) => void;
  onToggle: () => void;
  opened: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  showError: boolean;
}) {
  const letter = String.fromCharCode(65 + idx);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div className="rounded-md dark:border-gray-600">
      <button
        type="button"
        aria-expanded={opened}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="rounded-md group flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left
        bg-gray-200 dark:bg-gray-700
            hover:bg-gray-300 dark:hover:bg-gray-600
          appearance-none border-0 ring-0
          focus:outline-none focus:ring-0
          focus-visible:outline-none focus-visible:ring-0"
      >
        {/* 左：バッジ＋ラベル */}
        <div className="min-w-0 flex items-center gap-2">
          {/* バッジ：濃いグレー枠 */}
          <span
            className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px]
                      border-gray-500 bg-gray-100 text-gray-700
                      dark:border-gray-500 dark:bg-gray-800 dark:text-gray-200"
          >
            選択肢 {letter}
          </span>

          {/* ラベル入力：濃いグレー枠 */}
          <input
            className="input h-8 w-[220px] sm:w-[280px] md:w-[320px]
                      !border-gray-500 dark:!border-gray-500
                      focus:!border-gray-600 focus:!ring-1 focus:!ring-gray-600
                      dark:focus:!border-gray-500 dark:focus:!ring-gray-500"
            value={label}
            placeholder="（例）キッズ"
            onChange={(e) => onChangeLabel(e.target.value)}
            onClick={stop}
            onMouseDown={stop}
            aria-invalid={showError || undefined}
          />

          {showError && <RequiredBadge />}
        </div>

        {/* 右：操作群 */}
        <div className="flex shrink-0 items-center gap-1.5">
          {[
            { onClick: onMoveUp, label: "上へ", Icon: ArrowUp },
            { onClick: onMoveDown, label: "下へ", Icon: ArrowDown },
            { onClick: onDuplicate, label: "複製", Icon: Copy },
          ].map(({ onClick, label, Icon }) => (
            <button
              key={label}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="inline-flex items-center gap-1 rounded-full
                border border-gray-500 dark:border-gray-500
                bg-white px-3 py-1.5 text-xs hover:bg-gray-50
                dark:bg-gray-900 dark:hover:bg-gray-800"
              title={label}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}

          {/* 削除 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="inline-flex items-center gap-1 rounded-md
              border dark:border-gray-500
              ring-1 ring-inset ring-gray-500 dark:ring-gray-500
              bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            title="削除"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">削除</span>
          </button>

          {/* 矢印 */}
          <ChevronDown
            size={20}
            className={`shrink-0 transition-transform duration-200 ${
              opened ? "rotate-180" : ""
            } text-gray-600 dark:text-gray-300`}
            aria-hidden
          />
        </div>
      </button>
    </div>
  );
}

export function FAQEditor({
  item,
  path,
  onChange,
  level = 0,
  hasError,
  breadcrumb = [],
  naked = false, // ★ 追加: デフォルトは枠線あり
}: Props) {
  const update = useCallback(
    (updated: FAQItem) => onChange(path, updated),
    [onChange, path],
  );
  const invalid = (fieldPath: (number | string)[], field: string) =>
    hasError ? hasError(fieldPath, field) : false;

  // option ごとの開閉状態
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});
  const toggleOpt = (i: number) =>
    setOpenMap((m) => {
      const cur = i in m ? m[i] : true; // 未定義=開いている
      return { ...m, [i]: !cur };
    });

  // 並べ替え/複製/削除
  const moveOpt = (from: number, to: number) => {
    if (to < 0 || to >= (item as any).options?.length) return;
    const next = [...(item as any).options];
    [next[from], next[to]] = [next[to], next[from]];
    update({ ...(item as any), options: next } as FAQItem);
    setOpenMap((m) => ({ ...m, [to]: m[from] ?? true })); // 開閉状態を移動先に引継ぎ
  };
  const dupOpt = (i: number) => {
    const next = [...(item as any).options];
    next.splice(i + 1, 0, JSON.parse(JSON.stringify((item as any).options[i])));
    update({ ...(item as any), options: next } as FAQItem);
    setOpenMap((m) => ({ ...m, [i + 1]: true }));
  };
  const removeOpt = (i: number) => {
    update({
      ...(item as any),
      options: (item as any).options.filter((_: any, j: number) => j !== i),
    } as FAQItem);
  };

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

  // ===== question =====
  if (item.type === "question") {
    const qErr = invalid(path, "question");
    const aErr = invalid(path, "answer");

    const frame = levelWrap(level, !naked); // ★ 内側なら枠線なし

    return (
      <div
        className={`${frame}
          dark:[&_label]:text-gray-200
          dark:[&_input]:bg-gray-900 dark:[&_input]:text-gray-100 dark:[&_input]:placeholder:text-gray-500 dark:[&_input]:border-gray-700
          dark:[&_textarea]:bg-gray-900 dark:[&_textarea]:text-gray-100 dark:[&_textarea]:placeholder:text-gray-500 dark:[&_textarea]:border-gray-700`}
        id={nodeId(path)}
        data-path={path.join(".")}
      >
        <NodeHeader
          level={level}
          type="question"
          onSwitch={switchType}
          breadcrumb={breadcrumb}
        />

        <div className="space-y-4">
          <div className="grid gap-2">
            <FieldLabel>質問 {qErr && <RequiredBadge />}</FieldLabel>
            <input
              className="input"
              aria-invalid={qErr || undefined}
              value={item.question}
              onChange={(e) => update({ ...item, question: e.target.value })}
              placeholder="質問文"
            />
          </div>

          <div className="grid gap-2">
            <FieldLabel>回答 {aErr && <RequiredBadge />}</FieldLabel>
            <textarea
              className="input"
              aria-invalid={aErr || undefined}
              rows={3}
              value={item.answer}
              onChange={(e) => update({ ...item, answer: e.target.value })}
              placeholder="回答テキスト"
            />
          </div>

          <div className="grid gap-2">
            <FieldLabel>リンクURL（任意）</FieldLabel>
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

  // ===== select =====
  const frame = levelWrap(level, !naked); // ★ 内側なら枠線なし

  return (
    <div
      className={`${frame}
        dark:[&_label]:text-gray-200
        dark:[&_input]:bg-gray-900 dark:[&_input]:text-gray-100 dark:[&_input]:placeholder:text-gray-500 dark:[&_input]:border-gray-700
        dark:[&_textarea]:bg-gray-900 dark:[&_textarea]:text-gray-100 dark:[&_textarea]:placeholder:text-gray-500 dark:[&_textarea]:border-gray-700`}
      id={nodeId(path)}
      data-path={path.join(".")}
    >
      <NodeHeader
        level={level}
        type="select"
        onSwitch={switchType}
        breadcrumb={breadcrumb}
      />

      <div className="space-y-4">
        <div className="grid gap-2">
          <FieldLabel>
            質問 {invalid(path, "question") && <RequiredBadge />}
          </FieldLabel>
          <input
            className="input"
            aria-invalid={invalid(path, "question") || undefined}
            value={item.question}
            onChange={(e) => update({ ...item, question: e.target.value })}
            placeholder="質問文（分岐の親）"
          />
        </div>

        <div className="grid gap-2">
          <FieldLabel>選択後の案内文（任意）</FieldLabel>
          <input
            className="input"
            value={item.answer ?? ""}
            onChange={(e) => update({ ...item, answer: e.target.value })}
            placeholder="（例）下の選択肢から選んでください"
          />
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            選択肢
          </div>

          {item.options.map((opt, idx) => {
            const hasLabelErr = invalid([...path, "options", idx], "label");
            const opened = idx in openMap ? openMap[idx] : true;

            return (
              <div key={idx} className={levelWrap(level + 1, true)}>
                {/* ↑ ここ（選択肢ヘッダーの外枠）は従来どおり枠線あり */}

                <OptionHeader
                  idx={idx}
                  label={opt.label}
                  onChangeLabel={(v) =>
                    update({
                      ...item,
                      options: item.options.map((o, j) =>
                        j === idx ? { ...o, label: v } : o,
                      ),
                    })
                  }
                  opened={opened}
                  onToggle={() => toggleOpt(idx)}
                  onMoveUp={() => moveOpt(idx, idx - 1)}
                  onMoveDown={() => moveOpt(idx, idx + 1)}
                  onDuplicate={() => dupOpt(idx)}
                  onRemove={() => removeOpt(idx)}
                  showError={hasLabelErr}
                />

                {opened && (
                  <div className="mt-3">
                    {/* ★ 内側のFAQ（子ノード）は枠線なしで表示 */}
                    <FAQEditor
                      item={opt.next}
                      path={[...path, "options", idx, "next"]}
                      onChange={onChange}
                      level={level + 1}
                      hasError={hasError}
                      breadcrumb={[
                        ...(breadcrumb || []),
                        opt.label || "（ラベル未設定）",
                      ]}
                      naked
                    />
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              const newIndex = item.options.length;
              update({
                ...item,
                options: [
                  ...item.options,
                  {
                    label: "",
                    next: { type: "question", question: "", answer: "" },
                  },
                ],
              });
              setOpenMap((m) => ({ ...m, [newIndex]: true }));
            }}
          >
            ＋ 選択肢を追加
          </button>
        </div>
      </div>
    </div>
  );
}
