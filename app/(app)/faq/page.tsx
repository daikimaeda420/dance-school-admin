// app/faq/page.tsx — Q&A エディタ（1カラム版・プレビュー削除）
"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { produce } from "immer";
import { MessagesSquare, CodeXml, BadgeCheck, Palette } from "lucide-react";
import { FAQEditor } from "../../../components/FAQEditor";

// schoolId を含む型
type UserWithSchool = {
  name?: string;
  email?: string;
  image?: string;
  schoolId?: string;
};

const PALETTES = [
  { value: "navy", label: "Navy", color: "#2f5c7a" },
  { value: "emerald", label: "Emerald", color: "#0f766e" },
  { value: "orange", label: "Orange", color: "#ea580c" },
  { value: "purple", label: "Purple", color: "#6d28d9" },
  { value: "rose", label: "Rose", color: "#be123c" },
  { value: "gray", label: "Gray", color: "#374151" },
] as const;
type PaletteValue = (typeof PALETTES)[number]["value"];

export type FAQItem =
  | {
      type: "question";
      question: string;
      answer: string;
      url?: string;
    }
  | {
      type: "select";
      question: string;
      answer: string;
      options: { label: string; next: FAQItem }[];
    };

/** {items:[...]} / [...] どちらでも“配列”に正規化する */
function asArray(maybe: unknown): FAQItem[] {
  if (Array.isArray(maybe)) return maybe as FAQItem[];
  if (
    maybe &&
    typeof maybe === "object" &&
    Array.isArray((maybe as any).items)
  ) {
    return (maybe as any).items as FAQItem[];
  }
  return [];
}

// 入力検証：空の質問、空の回答（question型）、空のラベルなどを検出
function validateFAQ(items: FAQItem[]) {
  const errors = new Set<string>();
  let questions = 0;
  let selects = 0;
  let options = 0;
  let maxDepth = 0;

  const key = (path: (number | string)[], field: string) =>
    [...path, field].join(".");

  const walk = (item: FAQItem, path: (number | string)[], depth: number) => {
    maxDepth = Math.max(maxDepth, depth);
    if (item.type === "question") {
      questions++;
      if (!item.question.trim()) errors.add(key(path, "question"));
      if (!item.answer.trim()) errors.add(key(path, "answer"));
      return;
    }
    // select
    selects++;
    if (!item.question.trim()) errors.add(key(path, "question"));
    if (Array.isArray(item.options)) {
      item.options.forEach((opt, i) => {
        options++;
        if (!opt.label.trim())
          errors.add(key([...path, "options", i], "label"));
        walk(opt.next, [...path, "options", i, "next"], depth + 1);
      });
    }
  };

  items.forEach((it, i) => walk(it, [i], 1));
  return {
    errors,
    stats: {
      nodes: questions + selects,
      questions,
      selects,
      options,
      maxDepth,
    },
  };
}

export default function FAQPage() {
  const { data: session, status } = useSession();
  const user = session?.user as UserWithSchool;
  const schoolId = user?.schoolId;

  const [faq, setFaq] = useState<FAQItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false); // ← 単純な dirty フラグに変更

  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [query, setQuery] = useState("");

  // ▼ テーマパレット（DBから読み書きするメタ）
  const [palette, setPalette] = useState<PaletteValue>("navy");

  // ▼ CTA設定（DBから読み書き）
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  // ▼ ランチャー吹き出しテキスト（DBから読み書き）
  const [launcherText, setLauncherText] = useState("質問はコチラ");

  // ▼ 表示設定
  const [chatEnabled, setChatEnabled] = useState(true);
  const [diagnosisEnabled, setDiagnosisEnabled] = useState(false);
  const [bottomOffsetPc, setBottomOffsetPc] = useState(24);
  const [bottomOffsetSp, setBottomOffsetSp] = useState(16);

  // 取得（FAQ + メタ）
  useEffect(() => {
    if (status === "authenticated" && schoolId) {
      fetch(`/api/faq?school=${schoolId}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          const arr = asArray(data);

          let nextPalette: PaletteValue = "navy";
          let nextCtaLabel = "";
          let nextCtaUrl = "";
          let nextLauncherText = "質問はコチラ";
          let nextChatEnabled = true;
          let nextDiagnosisEnabled = false;
          let nextBottomOffsetPc = 24;
          let nextBottomOffsetSp = 16;

          if (data && typeof data === "object") {
            const d = data as any;
            if (
              typeof d.palette === "string" &&
              PALETTES.some((p) => p.value === d.palette)
            ) {
              nextPalette = d.palette as PaletteValue;
            }
            if (typeof d.ctaLabel === "string") nextCtaLabel = d.ctaLabel;
            if (typeof d.ctaUrl === "string") nextCtaUrl = d.ctaUrl;
            if (typeof d.launcherText === "string" && d.launcherText.trim()) {
              nextLauncherText = d.launcherText;
            }
            if (typeof d.chatEnabled === "boolean") nextChatEnabled = d.chatEnabled;
            if (typeof d.diagnosisEnabled === "boolean") {
              nextDiagnosisEnabled = d.diagnosisEnabled;
            }
            if (typeof d.bottomOffsetPc === "number") nextBottomOffsetPc = d.bottomOffsetPc;
            if (typeof d.bottomOffsetSp === "number") nextBottomOffsetSp = d.bottomOffsetSp;
          }

          setFaq(arr);
          setPalette(nextPalette);
          setCtaLabel(nextCtaLabel);
          setCtaUrl(nextCtaUrl);
          setLauncherText(nextLauncherText);
          setChatEnabled(nextChatEnabled);
          setDiagnosisEnabled(nextDiagnosisEnabled);
          setBottomOffsetPc(nextBottomOffsetPc);
          setBottomOffsetSp(nextBottomOffsetSp);
          setDirty(false); // ← サーバーから読み込んだ直後は「保存済み」扱い
        })
        .catch(() => {
          setFaq([]);
          setPalette("navy");
          setCtaLabel("");
          setCtaUrl("");
          setLauncherText("質問はコチラ");
          setChatEnabled(true);
          setDiagnosisEnabled(false);
          setBottomOffsetPc(24);
          setBottomOffsetSp(16);
          setDirty(false); // 空データ読み込みも保存済み扱い
        });
    }
  }, [status, schoolId]);

  // 未保存警告
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // ⌘S / Ctrl+S で保存
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveFAQ();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const saveFAQ = async () => {
    if (!schoolId) return;
    setSaving(true);

    // ★ 配列だけではなく、メタ情報もまとめて送信
    const payload = {
      items: faq,
      palette,
      ctaLabel: ctaLabel.trim() || null,
      ctaUrl: ctaUrl.trim() || null,
      launcherText: launcherText.trim() || null,
      chatEnabled,
      diagnosisEnabled,
      bottomOffsetPc,
      bottomOffsetSp,
    };

    const res = await fetch(`/api/faq?school=${schoolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (res.ok) {
      setDirty(false); // ← 保存成功したら「保存済み」
      alert("保存しました！");
    } else {
      const err = await res.json().catch(() => ({}));
      alert("保存に失敗しました: " + (err.error || "不明なエラー"));
    }
  };

  const updateFaqAtPath = useCallback(
    (path: (number | string)[], updated: FAQItem) => {
      setFaq((prev) =>
        produce(prev, (draft: any) => {
          let current = draft;
          for (let i = 0; i < path.length - 1; i++) current = current[path[i]];
          current[path[path.length - 1]] = updated;
        }),
      );
      setDirty(true); // ← 内容をいじったら dirty
    },
    [],
  );

  // 入力検証と統計
  const { errors } = useMemo(() => validateFAQ(faq), [faq]);
  const makeKey = useCallback(
    (path: (number | string)[], field: string) => [...path, field].join("."),
    [],
  );
  const hasError = useCallback(
    (path: (number | string)[], field: string) =>
      errors.has(makeKey(path, field)),
    [errors, makeKey],
  );

  // 検索（最初の一致へスクロール）
  const scrollToFirstMatch = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hitIndex = faq.findIndex((it) =>
      JSON.stringify(it).toLowerCase().includes(q),
    );
    if (hitIndex >= 0) {
      const el = document.getElementById(`node-${hitIndex}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      setCollapsed((c) => ({ ...c, [hitIndex]: false }));
    } else {
      alert("一致する項目が見つかりませんでした");
    }
  };

  // ▼ script方式（school のみ反映。テーマ/CTA は DB の値を使用）
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const attrs = [
    `src="${baseUrl}/embed.js"`,
    `data-rizbo-school="${schoolId}"`,
  ].join("\n  ");

  const embedScriptCode = `<script ${attrs}></script>`;

  const empty = useMemo(() => faq.length === 0, [faq.length]);

  if (status === "loading") return <p className="p-6">読み込み中...</p>;
  if (status === "unauthenticated")
    return <p className="p-6">ログインが必要です。</p>;
  if (!schoolId) return <p className="p-6">schoolId が見つかりません。</p>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* 見出し + ツールバー */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <MessagesSquare aria-hidden="true" className="w-6 h-6" />
          <span>Q&A編集</span>
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          チャットボットの質問の追加・編集を行います。変更後は必ず保存してください。
        </p>
      </div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {dirty && (
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs
              border border-amber-300 bg-amber-50 text-amber-800
              dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200"
            >
              未保存の変更あり
            </span>
          )}
          {errors.size > 0 && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                const first = Array.from(errors)[0];
                const topIndex = Number(first.split(".")[0]); // "0.question" → 0
                const el = document.getElementById(`node-${topIndex}`);
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              エラー {errors.size} 件
            </button>
          )}
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && scrollToFirstMatch()}
              className="input pr-20"
              placeholder="キーワード検索"
            />
            <button
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 btn-ghost px-2 py-1 text-xs"
              onClick={scrollToFirstMatch}
            >
              検索
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setFaq([...faq, { type: "question", question: "", answer: "" }]);
              setDirty(true);
            }}
            className="btn-ghost"
          >
            ＋ 通常の質問
          </button>
          <button
            type="button"
            onClick={() => {
              setFaq([
                ...faq,
                {
                  type: "select",
                  question: "",
                  answer: "",
                  options: [
                    {
                      label: "",
                      next: { type: "question", question: "", answer: "" },
                    },
                  ],
                },
              ]);
              setDirty(true);
            }}
            className="btn-ghost"
          >
            ＋ 選択肢ブロック
          </button>
          <button
            type="button"
            onClick={() =>
              setCollapsed(Object.fromEntries(faq.map((_, i) => [i, true])))
            }
            className="btn-ghost"
          >
            すべて閉じる
          </button>
          <button
            type="button"
            onClick={() => setCollapsed({})}
            className="btn-ghost"
          >
            すべて開く
          </button>
          <button
            type="button"
            onClick={saveFAQ}
            disabled={saving || !dirty}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? "保存中..." : dirty ? "保存する（⌘/Ctrl+S）" : "保存済み"}
          </button>
        </div>
      </div>

      {/* ===== 1カラム構成 ===== */}
      <div className="space-y-6">
        {/* 🔥 埋め込み表示設定 */}
        <section className="card">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <CodeXml aria-hidden="true" className="w-5 h-5" />
              <span>埋め込み表示設定</span>
            </h3>
            <p className="text-xs text-gray-500">
              埋め込みスクリプトで表示する機能をON/OFFできます。診断バナーは左下（PC）または右下上部（チャットの上/モバイル）に表示されます。
            </p>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* チャットボット表示トグル */}
              <div className="flex items-center justify-between border p-4 rounded-lg">
                <div>
                  <h4 className="font-medium text-sm">チャットボットを表示</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    右下のチャットボットアイコンを表示します
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={chatEnabled}
                    onChange={(e) => {
                      setChatEnabled(e.target.checked);
                      setDirty(true);
                    }}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* 診断バナー表示トグル */}
              <div className="flex items-center justify-between border p-4 rounded-lg">
                <div>
                  <h4 className="font-medium text-sm">診断バナーを表示</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    左下に診断ページへのリンクバナーを表示します
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={diagnosisEnabled}
                    onChange={(e) => {
                      setDiagnosisEnabled(e.target.checked);
                      setDirty(true);
                    }}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* 下部からの位置 */}
              <div className="flex items-center justify-between border p-4 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">下部からの位置（PC / スマホ）</h4>
                  <p className="text-xs text-gray-500 mt-1 mb-2">
                    既存のバナー等と重なる場合は数値を大きくしてください
                  </p>
                  <div className="flex items-center gap-4 text-sm mt-3">
                    <div className="flex items-center gap-2">
                      <label className="text-gray-600">PC (px):</label>
                      <input
                        type="number"
                        className="input w-20 px-2 py-1 text-sm"
                        value={bottomOffsetPc}
                        onChange={(e) => {
                          setBottomOffsetPc(Number(e.target.value));
                          setDirty(true);
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-gray-600">スマホ (px):</label>
                      <input
                        type="number"
                        className="input w-20 px-2 py-1 text-sm"
                        value={bottomOffsetSp}
                        onChange={(e) => {
                          setBottomOffsetSp(Number(e.target.value));
                          setDirty(true);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* エディタ */}
        <section className="space-y-4">
          {empty ? (
            <div className="card p-6 text-sm text-gray-600 dark:text-gray-300">
              まだ項目がありません。右上の「通常の質問」または「選択肢ブロック」から追加してください。
            </div>
          ) : (
            faq.map((item, i) => (
              <div key={i} className="card p-5" id={`node-${i}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setCollapsed((c) => ({ ...c, [i]: !c[i] }))}
                  >
                    {collapsed[i] ? "▼ 開く" : "▲ 閉じる"}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      disabled={i === 0}
                      onClick={() =>
                        setFaq((prev) => {
                          const next = [...prev];
                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                          setDirty(true);
                          return next;
                        })
                      }
                    >
                      ↑ 上へ
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      disabled={i === faq.length - 1}
                      onClick={() =>
                        setFaq((prev) => {
                          const next = [...prev];
                          [next[i + 1], next[i]] = [next[i], next[i + 1]];
                          setDirty(true);
                          return next;
                        })
                      }
                    >
                      ↓ 下へ
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      onClick={() =>
                        setFaq((prev) => {
                          const next = [
                            ...prev.slice(0, i + 1),
                            JSON.parse(JSON.stringify(item)),
                            ...prev.slice(i + 1),
                          ];
                          setDirty(true);
                          return next;
                        })
                      }
                    >
                      ⧉ 複製
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFaq((prev) => {
                          const next = prev.filter((_, j) => j !== i);
                          setDirty(true);
                          return next;
                        })
                      }
                      className="text-sm text-red-600 hover:underline"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {!collapsed[i] && (
                  <FAQEditor
                    item={item}
                    path={[i]}
                    onChange={updateFaqAtPath}
                    level={0}
                    hasError={hasError}
                  />
                )}
              </div>
            ))
          )}
        </section>

        {/* 🎨 テーマカラー */}
        <section className="card">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <Palette aria-hidden="true" className="w-5 h-5" />
              <span>テーマカラー</span>
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {PALETTES.map((p) => {
                const active = palette === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setPalette(p.value);
                      setDirty(true);
                    }}
                    className={[
                      "rounded-xl border px-3 py-2 text-left transition",
                      active
                        ? "ring-2 ring-blue-500 border-blue-300 bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700",
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    <div
                      className="h-6 w-full rounded mb-1.5"
                      style={{ background: p.color }}
                      aria-hidden
                    />
                    <div className="text-xs text-gray-700 dark:text-gray-200">
                      {p.label}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              選択したカラーはチャットボットのテーマカラーとして反映されます。
            </p>
          </div>
        </section>

        {/* ✅ CTA設定 */}
        <section className="card">
          <div className="card-header">
            <h3 className="font-semibold">CTA設定（任意）</h3>
            <p className="text-xs text-gray-500">
              ここで設定した内容は DB に保存され、チャットボット下部の CTA
              ボタンとして表示されます。 両方入力した場合のみ、CTA
              ボタンが表示されます。
            </p>
          </div>
          <div className="card-body grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">
                CTAボタン文言 <span className="text-gray-500">(ctaLabel)</span>
              </label>
              <input
                className="input w-full"
                value={ctaLabel}
                onChange={(e) => {
                  setCtaLabel(e.target.value);
                  setDirty(true);
                }}
                placeholder="例）無料体験のお申し込みはこちら"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                CTAボタンURL <span className="text-gray-500">(ctaUrl)</span>
              </label>
              <input
                className="input w-full"
                value={ctaUrl}
                onChange={(e) => {
                  setCtaUrl(e.target.value);
                  setDirty(true);
                }}
                placeholder="例）https://example.com/entry"
              />
              <p className="mt-1 text-xs text-gray-500">
                先頭は <code>https://</code> で入力してください。
              </p>
            </div>
          </div>
        </section>

        {/* ✅ ランチャー吹き出しテキスト設定 */}
        <section className="card">
          <div className="card-header">
            <h3 className="font-semibold">
              ランチャー吹き出しテキスト（任意）
            </h3>
            <p className="text-xs text-gray-500">
              画面右下のチャットボットアイコンの上部に表示される吹き出しの文言です。
              未入力の場合は「質問はコチラ」が表示されます。
            </p>
          </div>
          <div className="card-body">
            <label className="block text-sm font-medium mb-1">
              吹き出し文言 <span className="text-gray-500">(launcherText)</span>
            </label>
            <input
              className="input w-full"
              value={launcherText}
              onChange={(e) => {
                setLauncherText(e.target.value);
                setDirty(true);
              }}
              placeholder="例）質問はコチラ／チャットで相談できます"
            />
          </div>
        </section>

        {/* 埋め込みコード（script方式） */}
        <section className="card">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <CodeXml aria-hidden="true" className="w-5 h-5" />
              <span>埋め込みコード（script）</span>
            </h3>
          </div>
          <div className="card-body">
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
              外部サイトには下記の <code>&lt;script&gt;</code>{" "}
              を貼り付けてください。 テーマカラーと CTA
              設定、ランチャー吹き出しテキストは DB
              に保存された内容が自動で使用されます。
            </p>
            <div className="flex items-start gap-2">
              <textarea
                readOnly
                rows={Math.min(12, embedScriptCode.split("\n").length + 1)}
                value={embedScriptCode}
                className="input font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(embedScriptCode);
                  alert("コピーしました！");
                }}
                className="btn-ghost shrink-0"
              >
                コピー
              </button>
            </div>
          </div>
        </section>

        {/* バリデーション */}
        <section className="card">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <BadgeCheck aria-hidden="true" className="w-5 h-5" />
              <span>バリデーション</span>
            </h3>
          </div>
          <div className="card-body text-sm">
            {errors.size === 0 ? (
              <p className="text-emerald-600 dark:text-emerald-300">
                問題は見つかりませんでした。
              </p>
            ) : (
              <ul className="list-disc pl-5 space-y-1 text-amber-700 dark:text-amber-200">
                <li>未入力の質問/回答、空のラベル等を検出しています。</li>
                <li>
                  入力欄が赤く縁取りされている箇所を修正してください（エラー{" "}
                  {errors.size} 件）。
                </li>
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
