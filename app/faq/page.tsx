// app/faq/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { produce } from "immer";
import { FAQEditor } from "../../components/FAQEditor";

// schoolId を含む型を明示的に定義
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
        .then(setFaq);
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
      ) as HTMLIFrameElement;
      iframe?.contentWindow?.location.reload();
    } else {
      const err = await res.json();
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

  if (status === "loading") return <p>読み込み中...</p>;
  if (status === "unauthenticated") return <p>ログインが必要です。</p>;
  if (!schoolId) return <p>schoolId が見つかりません。</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">
        📘 {schoolId} スクールのFAQ管理
      </h2>

      {faq.map((item, i) => (
        <div key={i}>
          <FAQEditor item={item} path={[i]} onChange={updateFaqAtPath} />
          <button
            type="button"
            onClick={() => setFaq((prev) => prev.filter((_, j) => j !== i))}
            className="text-red-500 text-sm underline mb-4"
          >
            削除
          </button>
        </div>
      ))}

      <div className="flex gap-4 mb-4">
        <button
          type="button"
          onClick={() =>
            setFaq([...faq, { type: "question", question: "", answer: "" }])
          }
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ＋ 通常の質問を追加
        </button>
        <button
          type="button"
          onClick={() =>
            setFaq([
              ...faq,
              {
                type: "select",
                question: "",
                answer: "", // ← 🔧 これを追加！
                options: [
                  {
                    label: "",
                    next: { type: "question", question: "", answer: "" },
                  },
                ],
              },
            ])
          }
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          ＋ 選択肢ブロックを追加
        </button>
      </div>

      <hr className="my-4" />
      <button
        type="button"
        onClick={saveFAQ}
        disabled={saving}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存する"}
      </button>

      <h3 className="text-xl font-bold mt-10 mb-2">
        🔍 チャットボット プレビュー
      </h3>
      <iframe
        id="chatbot-iframe"
        src={`/embed/chatbot?school=${schoolId}`}
        style={{ width: "100%", height: "600px", border: "1px solid #ccc" }}
      />

      <div className="mt-10">
        <h3 className="text-xl font-bold mb-2">🧩 埋め込みコード</h3>
        <p className="mb-1 text-sm text-gray-600">
          このコードをあなたのWebサイトに貼り付けてチャットボットを埋め込めます：
        </p>
        <div className="flex gap-2 items-start">
          <textarea
            readOnly
            rows={4}
            value={iframeCode}
            className="w-full border p-2 text-sm font-mono rounded"
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(iframeCode);
              alert("コピーしました！");
            }}
            className="bg-gray-700 text-white px-3 py-2 rounded hover:bg-gray-800 text-sm"
          >
            コピー
          </button>
        </div>
      </div>
    </div>
  );
}
