// app/(app)/admin/diagnosis/faqs/FaqAdminClient.tsx
"use client";

import { useEffect, useState } from "react";

type Faq = {
  id: string;
  schoolId: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

type Props = { schoolId: string };

const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
  "disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

const textareaCls = inputCls + " min-h-[80px] py-2 resize-y";

export default function FaqAdminClient({ schoolId }: Props) {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 新規入力
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");

  // 編集中
  const [editId, setEditId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");

  const disabled = !schoolId;

  const fetchFaqs = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/diagnosis/faqs?schoolId=${encodeURIComponent(schoolId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("取得に失敗しました");
      const data = await res.json();
      setFaqs(Array.isArray(data.faqs) ? data.faqs : []);
    } catch (e: any) {
      setError(e?.message ?? "通信エラー");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFaqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const handleCreate = async () => {
    if (!schoolId || !newQ.trim() || !newA.trim()) {
      setError("質問と回答は必須です。");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/diagnosis/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          question: newQ.trim(),
          answer: newA.trim(),
          sortOrder: faqs.length,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message ?? "作成に失敗しました");
      }
      setNewQ("");
      setNewA("");
      await fetchFaqs();
    } catch (e: any) {
      setError(e?.message ?? "通信エラー");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (faq: Faq) => {
    setSavingId(faq.id);
    try {
      const res = await fetch(`/api/admin/diagnosis/faqs/${faq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !faq.isActive }),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      await fetchFaqs();
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleEdit = (faq: Faq) => {
    setEditId(faq.id);
    setEditQ(faq.question);
    setEditA(faq.answer);
  };

  const handleEditSave = async (id: string) => {
    if (!editQ.trim() || !editA.trim()) {
      setError("質問と回答は必須です。");
      return;
    }
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/diagnosis/faqs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: editQ.trim(), answer: editA.trim() }),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      setEditId(null);
      await fetchFaqs();
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("このFAQを削除しますか？")) return;
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/diagnosis/faqs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("削除に失敗しました");
      setFaqs((prev) => prev.filter((f) => f.id !== id));
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 新規追加 */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          よくある質問を追加
        </h2>
        <div className="space-y-2">
          <div>
            <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
              Q（質問）
            </div>
            <input
              className={inputCls}
              placeholder="例：体験レッスンはありますか？"
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              disabled={disabled || saving}
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
              A（回答）
            </div>
            <textarea
              className={textareaCls}
              placeholder="例：はい、初回は無料で体験いただけます。"
              value={newA}
              onChange={(e) => setNewA(e.target.value)}
              disabled={disabled || saving}
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={disabled || saving || !newQ.trim() || !newA.trim()}
          className="mt-3 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {saving ? "保存中..." : "追加"}
        </button>
      </div>

      {/* エラー */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {/* 一覧 */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          FAQ一覧{" "}
          {loading && (
            <span className="text-xs font-normal text-gray-400">読み込み中...</span>
          )}
        </h2>

        {faqs.length === 0 && !loading ? (
          <div className="text-xs text-gray-400 dark:text-gray-500">
            FAQがまだ登録されていません。
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isSaving = savingId === faq.id;
              const isEditing = editId === faq.id;

              return (
                <div
                  key={faq.id}
                  className={[
                    "rounded-lg border p-3",
                    faq.isActive
                      ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                      : "border-gray-100 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-950",
                  ].join(" ")}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-gray-400">
                      #{i + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      {/* 有効/無効 */}
                      <button
                        onClick={() => handleToggleActive(faq)}
                        disabled={isSaving}
                        className={[
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold border transition",
                          faq.isActive
                            ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-950 dark:text-green-300"
                            : "border-gray-300 bg-white text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900",
                        ].join(" ")}
                      >
                        {faq.isActive ? "表示中" : "非表示"}
                      </button>
                      {/* 編集 */}
                      {!isEditing && (
                        <button
                          onClick={() => handleEdit(faq)}
                          disabled={isSaving}
                          className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                          編集
                        </button>
                      )}
                      {/* 削除 */}
                      <button
                        onClick={() => handleDelete(faq.id)}
                        disabled={isSaving}
                        className="rounded-full border border-red-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-500 hover:bg-red-50 dark:border-red-900 dark:bg-gray-900"
                      >
                        削除
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <div>
                        <div className="mb-1 text-[10px] font-semibold text-gray-500">Q</div>
                        <input
                          className={inputCls}
                          value={editQ}
                          onChange={(e) => setEditQ(e.target.value)}
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <div className="mb-1 text-[10px] font-semibold text-gray-500">A</div>
                        <textarea
                          className={textareaCls}
                          value={editA}
                          onChange={(e) => setEditA(e.target.value)}
                          disabled={isSaving}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSave(faq.id)}
                          disabled={isSaving}
                          className="rounded-full bg-blue-600 px-3 py-1 text-[10px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                        >
                          {isSaving ? "保存中..." : "保存"}
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="rounded-full border border-gray-300 px-3 py-1 text-[10px] font-semibold text-gray-600"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                        Q. {faq.question}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-gray-600 dark:text-gray-300">
                        A. {faq.answer}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
