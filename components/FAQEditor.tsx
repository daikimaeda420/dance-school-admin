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

const levelWrap = (level = 0, bordered = true) => {
  if (level === 0 || !bordered) return "";

  const cls = [
    "rounded-xl",
    "border",
    "border-slate-200",
    "bg-white",
    "p-4",
    "shadow-[0_1px_2px_rgba(15,23,42,0.035)]",
  ];

  cls.push("border-orange-100");

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
    <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">
            Level {level + 1}
          </span>
          <span className="text-slate-500">
            {type === "question" ? "回答を作成" : "選択肢を設定"}
          </span>
        </div>
        {breadcrumb.length > 0 && (
          <div className="mt-2 truncate text-xs text-slate-500">
            {breadcrumb.filter(Boolean).join(" › ")}
          </div>
        )}
      </div>

      <div className="inline-flex self-start rounded-lg border border-slate-200 bg-slate-50 p-1 sm:self-auto">
        <button
          type="button"
          onClick={() => onSwitch("question")}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors
            ${
              type === "question"
                ? "bg-[#fe6147] text-white shadow-sm"
                : "text-slate-500 hover:bg-white hover:text-slate-700"
            }`}
        >
          質問
        </button>
        <button
          type="button"
          onClick={() => onSwitch("select")}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors
            ${
              type === "select"
                ? "bg-[#fe6147] text-white shadow-sm"
                : "text-slate-500 hover:bg-white hover:text-slate-700"
            }`}
        >
          選択肢
        </button>
      </div>
    </div>
  );
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-sm font-semibold text-slate-700">{children}</label>
);

const RequiredBadge = () => (
  <span className="ml-2 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
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
        className="group flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-orange-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
      >
        {/* 左：バッジ＋ラベル */}
        <div className="min-w-0 flex items-center gap-2">
          {/* バッジ：濃いグレー枠 */}
          <span
            className="inline-flex shrink-0 items-center rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700"
          >
            選択肢 {letter}
          </span>

          {/* ラベル入力：濃いグレー枠 */}
          <input
            className="input h-9 w-[180px] bg-white text-sm sm:w-[260px] md:w-[320px]"
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
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#d94d38]"
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
            className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
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
            } text-slate-400`}
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
  naked = false,
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

    const frame = levelWrap(level, !naked);

    return (
      <div
        className={frame}
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
              className="input min-h-28"
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
  const frame = levelWrap(level, !naked);

  return (
    <div
      className={frame}
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

        <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">選択肢</div>
            <span className="text-xs text-slate-400">ドラッグせず、ボタンで並び替えできます</span>
          </div>

          {item.options.map((opt, idx) => {
            const hasLabelErr = invalid([...path, "options", idx], "label");
            const opened = idx in openMap ? openMap[idx] : true;

            return (
              <div key={idx} className="rounded-xl bg-white">
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
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
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
