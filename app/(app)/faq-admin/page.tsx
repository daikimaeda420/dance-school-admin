"use client";

import { useState } from "react";

type FaqQuestion = {
  type: "question";
  question: string;
  answer: string;
  url?: string;
};

type FaqSelect = {
  type: "select";
  question: string;
  options: { label: string; next: FaqQuestion }[];
};

type FaqItem = FaqQuestion | FaqSelect;

export default function FaqAdminPage() {
  const [school, setSchool] = useState("test");
  const [items, setItems] = useState<FaqItem[]>([
    {
      type: "question",
      question: "体験ありますか？",
      answer: "初回無料体験があります。",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const addQuestion = () => {
    setItems((prev) => [
      ...prev,
      { type: "question", question: "", answer: "" },
    ]);
  };

  const addSelect = () => {
    setItems((prev) => [
      ...prev,
      {
        type: "select",
        question: "",
        options: [
          { label: "", next: { type: "question", question: "", answer: "" } },
        ],
      },
    ]);
  };

  const updateItem = (index: number, next: Partial<FaqItem>) => {
    setItems((prev) => {
      const copy = [...prev] as any[];
      copy[index] = { ...copy[index], ...next };
      return copy;
    });
  };

  const updateOption = (
    itemIndex: number,
    optIndex: number,
    next: Partial<{ label: string; next: FaqQuestion }>
  ) => {
    setItems((prev) => {
      const copy = [...prev] as any[];
      const item = copy[itemIndex];
      if (item?.type !== "select") return prev;
      const opts = [...item.options];
      opts[optIndex] = { ...opts[optIndex], ...next } as any;
      copy[itemIndex] = { ...item, options: opts };
      return copy;
    });
  };

  const addOption = (itemIndex: number) => {
    setItems((prev) => {
      const copy = [...prev] as any[];
      const item = copy[itemIndex];
      if (item?.type !== "select") return prev;
      const opts = [
        ...item.options,
        { label: "", next: { type: "question", question: "", answer: "" } },
      ];
      copy[itemIndex] = { ...item, options: opts };
      return copy;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const removeOption = (itemIndex: number, optIndex: number) => {
    setItems((prev) => {
      const copy = [...prev] as any[];
      const item = copy[itemIndex];
      if (item?.type !== "select") return prev;
      const opts = item.options.filter((_: any, i: number) => i !== optIndex);
      copy[itemIndex] = { ...item, options: opts };
      return copy;
    });
  };

  const handleSave = async () => {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/faq?school=${encodeURIComponent(school)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "保存に失敗しました");
      setMsg(`保存完了（${data.action}）: ${data.schoolId}`);
    } catch (e: any) {
      setMsg(e.message || "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async () => {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/faq?school=${encodeURIComponent(school)}`);
      const data = await res.json();
      // GETの返り値は { items: FaqItem[], updatedAt, updatedBy }
      if (!Array.isArray(data?.items))
        throw new Error("取得フォーマットが不正です");
      setItems(data.items);
      setMsg(`読込完了（updatedBy: ${data.updatedBy ?? "—"}）`);
    } catch (e: any) {
      setMsg(e.message || "読込に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">FAQ 管理</h1>

      <div className="grid gap-3">
        <label className="text-sm">
          School ID
          <input
            className="block w-full border rounded p-2 mt-1"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="例: test"
          />
        </label>

        <div className="flex gap-2">
          <button
            className="border rounded px-3 py-2"
            onClick={addQuestion}
            type="button"
          >
            ＋ Question を追加
          </button>
          <button
            className="border rounded px-3 py-2"
            onClick={addSelect}
            type="button"
          >
            ＋ Select を追加
          </button>
          <button
            className="border rounded px-3 py-2"
            onClick={handleLoad}
            type="button"
            disabled={loading || !school}
          >
            既存を読み込む
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="border rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">
                {item.type === "question" ? "Question" : "Select"}
              </div>
              <button
                className="text-sm text-red-600"
                onClick={() => removeItem(idx)}
                type="button"
              >
                削除
              </button>
            </div>

            <label className="text-sm block">
              質問文
              <input
                className="block w-full border rounded p-2 mt-1"
                value={item.question}
                onChange={(e) =>
                  updateItem(idx, { question: e.target.value } as any)
                }
              />
            </label>

            {item.type === "question" ? (
              <>
                <label className="text-sm block">
                  回答
                  <textarea
                    className="block w-full border rounded p-2 mt-1"
                    rows={3}
                    value={item.answer}
                    onChange={(e) =>
                      updateItem(idx, { answer: e.target.value } as any)
                    }
                  />
                </label>
                <label className="text-sm block">
                  参考URL（任意）
                  <input
                    className="block w-full border rounded p-2 mt-1"
                    value={(item as any).url ?? ""}
                    onChange={(e) =>
                      updateItem(idx, { url: e.target.value } as any)
                    }
                  />
                </label>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="text-sm font-medium">選択肢</div>
                  {item.options.map((opt, j) => (
                    <div key={j} className="border rounded p-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold">
                          Option {j + 1}
                        </div>
                        <button
                          className="text-xs text-red-600"
                          onClick={() => removeOption(idx, j)}
                          type="button"
                        >
                          削除
                        </button>
                      </div>

                      <label className="text-xs block">
                        ラベル
                        <input
                          className="block w-full border rounded p-2 mt-1"
                          value={opt.label}
                          onChange={(e) =>
                            updateOption(idx, j, { label: e.target.value })
                          }
                        />
                      </label>

                      <div className="grid gap-2">
                        <div className="text-xs font-medium">
                          次の質問（next）
                        </div>
                        <label className="text-xs block">
                          質問
                          <input
                            className="block w-full border rounded p-2 mt-1"
                            value={opt.next.question}
                            onChange={(e) =>
                              updateOption(idx, j, {
                                next: { ...opt.next, question: e.target.value },
                              })
                            }
                          />
                        </label>
                        <label className="text-xs block">
                          回答
                          <textarea
                            className="block w-full border rounded p-2 mt-1"
                            rows={2}
                            value={opt.next.answer}
                            onChange={(e) =>
                              updateOption(idx, j, {
                                next: { ...opt.next, answer: e.target.value },
                              })
                            }
                          />
                        </label>
                        <label className="text-xs block">
                          URL（任意）
                          <input
                            className="block w-full border rounded p-2 mt-1"
                            value={(opt.next as any).url ?? ""}
                            onChange={(e) =>
                              updateOption(idx, j, {
                                next: { ...opt.next, url: e.target.value },
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                  <button
                    className="border rounded px-3 py-2 text-sm"
                    onClick={() => addOption(idx)}
                    type="button"
                  >
                    ＋ 選択肢を追加
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          className="border rounded px-4 py-2"
          onClick={handleSave}
          type="button"
          disabled={loading || !school}
        >
          {loading ? "保存中…" : "保存する"}
        </button>
        {msg && <p className="text-sm">{msg}</p>}
      </div>
    </main>
  );
}
