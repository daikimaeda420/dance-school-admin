// app/faq/page.tsx — Q&A エディタ（1カラム版・プレビュー削除）
"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { produce } from "immer";
import { MessagesSquare, CodeXml, BadgeCheck } from "lucide-react";
import { FAQEditor } from "../../components/FAQEditor";

// schoolId を含む型
type UserWithSchool = {
  name?: string;
  email?: string;
  image?: string;
  schoolId?: string;
};

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
  const initialRef = useRef<string>("[]");
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [query, setQuery] = useState("");

  // 取得
  useEffect(() => {
    if (status === "authenticated" && schoolId) {
      fetch(`/api/faq?school=${schoolId}`)
        .then((res) => res.json())
        .then((data) => {
          setFaq(data || []);
          initialRef.current = JSON.stringify(data || []);
        })
        .catch(() => {
          setFaq([]);
          initialRef.current = "[]";
        });
    }
  }, [status, schoolId]);

  const dirty = useMemo(
    () => JSON.stringify(faq) !== initialRef.current,
    [faq]
  );

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
    const res = await fetch(`/api/faq?school=${schoolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(faq),
    });
    setSaving(false);

    if (res.ok) {
      initialRef.current = JSON.stringify(faq);
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
        })
      );
    },
    []
  );

  // 入力検証と統計
  const { errors } = useMemo(() => validateFAQ(faq), [faq]);
  const makeKey = useCallback(
    (path: (number | string)[], field: string) => [...path, field].join("."),
    []
  );
  const hasError = useCallback(
    (path: (number | string)[], field: string) =>
      errors.has(makeKey(path, field)),
    [errors, makeKey]
  );

  // 検索（最初の一致へスクロール）
  const scrollToFirstMatch = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hitIndex = faq.findIndex((it) =>
      JSON.stringify(it).toLowerCase().includes(q)
    );
    if (hitIndex >= 0) {
      const el = document.getElementById(`node-${hitIndex}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      setCollapsed((c) => ({ ...c, [hitIndex]: false }));
    } else {
      alert("一致する項目が見つかりませんでした");
    }
  };

  // ▼▼ ここを「script方式」に変更 ▼▼
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const embedScriptCode = `<script src="${baseUrl}/embed.js" data-school="${schoolId}" data-theme="light" data-height="600" async></script>`;
  // ▲▲ ここまで ▲▲

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
            onClick={() =>
              setFaq([...faq, { type: "question", question: "", answer: "" }])
            }
            className="btn-ghost"
          >
            ＋ 通常の質問
          </button>
          <button
            type="button"
            onClick={() =>
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
              ])
            }
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
                        setFaq((prev) => [
                          ...prev.slice(0, i + 1),
                          JSON.parse(JSON.stringify(item)),
                          ...prev.slice(i + 1),
                        ])
                      }
                    >
                      ⧉ 複製
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFaq((prev) => prev.filter((_, j) => j !== i))
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

        {/* 埋め込みコード（script方式） */}
        <section className="card">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <CodeXml aria-hidden="true" className="w-5 h-5" />{" "}
              <span>埋め込みコード（script）</span>
            </h3>
          </div>
          <div className="card-body">
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
              外部サイトには下記の <code>&lt;script&gt;</code>{" "}
              を貼り付けてください。
            </p>
            <div className="flex items-start gap-2">
              <textarea
                readOnly
                rows={4}
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
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              ※ <code>public/embed.js</code> を配信してください。必要なら{" "}
              <code>data-theme</code> / <code>data-height</code>{" "}
              を調整できます。
            </p>
          </div>
        </section>

        {/* バリデーション */}
        <section className="card">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <BadgeCheck aria-hidden="true" className="w-5 h-5" />{" "}
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
