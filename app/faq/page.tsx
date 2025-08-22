// app/faq/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { produce } from "immer";
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

/** 凡例用の色（淡色＋細い枠） */
const LEVEL_CHIP = [
  "bg-amber-50 border-amber-200",
  "bg-emerald-50 border-emerald-200",
  "bg-sky-50 border-sky-200",
  "bg-rose-50 border-rose-200",
  "bg-indigo-50 border-indigo-200",
];

export default function FAQPage() {
  const { data: session, status } = useSession();
  const user = session?.user as UserWithSchool;
  const schoolId = user?.schoolId;

  const [faq, setFaq] = useState<FAQItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && schoolId) {
      fetch(`/api/faq?school=${schoolId}`)
        .then((res) => res.json())
        .then(setFaq)
        .catch(() => setFaq([]));
    }
  }, [status, schoolId]);

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
      alert("保存しました！");
      const iframe = document.getElementById(
        "chatbot-iframe"
      ) as HTMLIFrameElement | null;
      iframe?.contentWindow?.location.reload();
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
          for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
          }
          current[path[path.length - 1]] = updated;
        })
      );
    },
    []
  );

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const iframeCode = `<iframe src="${baseUrl}/embed/chatbot?school=${schoolId}" width="100%" height="600" style="border:none;"></iframe>`;

  const empty = useMemo(() => faq.length === 0, [faq.length]);

  if (status === "loading") return <p className="p-6">読み込み中...</p>;
  if (status === "unauthenticated")
    return <p className="p-6">ログインが必要です。</p>;
  if (!schoolId) return <p className="p-6">schoolId が見つかりません。</p>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* 見出し + ツールバー */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            📘 {schoolId} スクールのFAQ管理
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            入れ子にすると色だけ変えて表示します（線は最小限）。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            onClick={saveFAQ}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>

      {/* 凡例 */}
      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        {[0, 1, 2, 3].map((lv) => (
          <span
            key={lv}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
              LEVEL_CHIP[lv % LEVEL_CHIP.length]
            }`}
          >
            <span className="font-medium">Level {lv + 1}</span>
          </span>
        ))}
      </div>

      {/* 2カラム：左=編集 / 右=プレビュー */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 左：エディタ（外枠だけカード。内側の線はFAQEditorで最小化） */}
        <section className="space-y-4">
          {empty ? (
            <div className="card p-6 text-sm text-gray-600">
              まだ項目がありません。右上の「通常の質問」または「選択肢ブロック」から追加してください。
            </div>
          ) : (
            faq.map((item, i) => (
              <div key={i} className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-600">
                    Level 1
                  </div>
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

                {/* level=0 を渡す（入れ子で +1 される） */}
                <FAQEditor
                  item={item}
                  path={[i]}
                  onChange={updateFaqAtPath}
                  level={0}
                />
              </div>
            ))
          )}
        </section>

        {/* 右：プレビュー & 埋め込みコード */}
        <aside className="self-start space-y-6 lg:sticky lg:top-20">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">🔍 チャットボット プレビュー</h3>
            </div>
            <div className="card-body">
              <iframe
                id="chatbot-iframe"
                src={`/embed/chatbot?school=${schoolId}`}
                className="h-[600px] w-full rounded border border-gray-300"
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">🧩 埋め込みコード</h3>
            </div>
            <div className="card-body">
              <p className="mb-2 text-sm text-gray-600">
                このコードをWebサイトに貼り付けてチャットボットを埋め込めます：
              </p>
              <div className="flex items-start gap-2">
                <textarea
                  readOnly
                  rows={4}
                  value={iframeCode}
                  className="input font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(iframeCode);
                    alert("コピーしました！");
                  }}
                  className="btn-ghost shrink-0"
                >
                  コピー
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
