"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Header from "@/components/Header";

export default function FAQPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const [faq, setFaq] = useState<{ question: string; answer: string }[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetch(`/api/check-admin?school=${params.id}`)
        .then((res) => res.json())
        .then((data) => setHasPermission(data.ok));
    }
  }, [status, params.id]);

  useEffect(() => {
    if (status === "authenticated" && hasPermission) {
      fetch(`/api/faq?school=${params.id}`)
        .then((res) => res.json())
        .then(setFaq);
    }
  }, [status, params.id, hasPermission]);

  const updateQuestion = (index: number, value: string) => {
    const newFaq = [...faq];
    newFaq[index].question = value;
    setFaq(newFaq);
  };

  const updateAnswer = (index: number, value: string) => {
    const newFaq = [...faq];
    newFaq[index].answer = value;
    setFaq(newFaq);
  };

  const addFAQ = () => {
    setFaq([...faq, { question: "", answer: "" }]);
  };

  const deleteFAQ = (index: number) => {
    const newFaq = [...faq];
    newFaq.splice(index, 1);
    setFaq(newFaq);
  };

  const saveFAQ = async () => {
    setSaving(true);
    const res = await fetch(`/api/faq?school=${params.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(faq),
    });
    setSaving(false);
    alert(res.ok ? "保存しました！" : "保存に失敗しました");
  };

  if (status === "loading" || hasPermission === null)
    return <p>読み込み中...</p>;
  if (status === "unauthenticated") return <p>ログインが必要です。</p>;
  if (!hasPermission) return <p>このスクールの管理権限がありません。</p>;

  return (
    <>
      <Header />
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">
          📘 {params.id} スクールのFAQ管理
        </h2>

        {faq.map((item, i) => (
          <div key={i} className="border p-4 mb-4 rounded shadow bg-white">
            <input
              className="border w-full p-2 mb-2 rounded"
              placeholder="質問"
              value={item.question}
              onChange={(e) => updateQuestion(i, e.target.value)}
            />
            <textarea
              className="border w-full p-2 mb-2 rounded"
              placeholder="回答"
              value={item.answer}
              onChange={(e) => updateAnswer(i, e.target.value)}
            />
            <button
              onClick={() => deleteFAQ(i)}
              className="text-red-500 text-sm underline"
            >
              削除
            </button>
          </div>
        ))}

        <button
          onClick={addFAQ}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
        >
          ＋ 新しいFAQを追加
        </button>

        <hr className="my-4" />

        <button
          onClick={saveFAQ}
          disabled={saving}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </>
  );
}
