"use client";

import { useState } from "react";

type SelectOption = {
  label: string;
  next?: any;
};

type FaqQuestion =
  | string
  | {
      type: "select";
      text: string;
      options: SelectOption[];
    };

type FaqLog = {
  sessionId?: string;
  timestamp: string;
  question: FaqQuestion;
  answer?: any;
  url?: string;
};

type Props = {
  logs: FaqLog[];
};

const ITEMS_PER_PAGE = 5;

export default function ChatLogTreeView({ logs }: Props) {
  if (!logs || !Array.isArray(logs)) {
    return (
      <div className="mt-10 border-t pt-4">
        <h3 className="text-2xl font-bold mb-6 text-blue-800">
          🧭 セッション別 チャット履歴
        </h3>
        <p className="text-sm text-gray-500">ログが読み込まれていません</p>
      </div>
    );
  }

  // セッションでグループ化
  const sessions: Record<string, FaqLog[]> = {};
  logs.forEach((log) => {
    const id = log.sessionId || "unknown";
    if (!sessions[id]) sessions[id] = [];
    sessions[id].push(log);
  });

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionEntries, setSessionEntries] = useState(() =>
    Object.entries(sessions)
  );

  const totalPages = Math.ceil(sessionEntries.length / ITEMS_PER_PAGE);
  const paginatedSessions = sessionEntries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const toggle = (id: string) => {
    const newSet = new Set(openIds);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setOpenIds(newSet);
  };

  const formatDate = (logs: FaqLog[]) => {
    if (!logs.length) return "";
    const date = new Date(logs[0].timestamp);
    return date.toLocaleDateString();
  };

  const renderAnswer = (a: any): string => {
    if (typeof a === "string") return a;
    if (!a) return "-";
    return JSON.stringify(a);
  };

  const renderQuestion = (q: FaqQuestion, depth = 0): JSX.Element => {
    if (typeof q === "string") return <div className="mb-1">Q: {q}</div>;

    if (q && typeof q === "object" && q.type === "select") {
      return (
        <div className="mb-1">
          <div className="font-semibold">Q: {q.text}</div>
          <ul className="ml-4 list-disc text-sm">
            {q.options?.map((opt, idx) => (
              <li key={idx}>
                <span className="font-medium">選択肢:</span> {opt.label}
                {opt.next && (
                  <div className="ml-4 border-l border-gray-300 pl-2 mt-1">
                    {renderQuestion(opt.next.question ?? opt.next, depth + 1)}
                    {opt.next?.answer && (
                      <div className="text-green-700">
                        A: {renderAnswer(opt.next.answer)}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return <div className="italic text-gray-500">(不明な質問形式)</div>;
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm(`セッション「${sessionId}」を削除しますか？`)) return;

    try {
      const res = await fetch("/api/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        const text = await res.text();
        alert(`削除に失敗しました：${text}`);
        return;
      }

      setSessionEntries((prev) => prev.filter(([id]) => id !== sessionId));
    } catch (err) {
      console.error("削除エラー:", err);
      alert("削除に失敗しました（通信エラー）");
    }
  };

  return (
    <div className="mt-10 border-t pt-4">
      <h3 className="text-2xl font-bold mb-6 text-blue-800">
        🧭 セッション別 チャット履歴
      </h3>
      {sessionEntries.length === 0 ? (
        <p className="text-sm text-gray-500">ログがありません</p>
      ) : (
        <div className="space-y-4">
          {paginatedSessions.map(([id, logs]) => (
            <div key={id} className="border border-gray-300 rounded shadow-sm">
              <div
                className="bg-blue-50 hover:bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-900 cursor-pointer rounded-t flex justify-between items-center"
                onClick={() => toggle(id)}
              >
                <span>
                  {openIds.has(id) ? "▼" : "▶"} セッション ID: {id}（
                  {logs.length} 件, {formatDate(logs)}）
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(id);
                  }}
                  className="text-red-600 text-xs border border-red-300 px-2 py-1 rounded hover:bg-red-100"
                >
                  🗑 削除
                </button>
              </div>
              {openIds.has(id) && (
                <ul className="px-5 py-3 text-sm space-y-4 bg-white">
                  {logs.map((log, i) => (
                    <li
                      key={i}
                      className="break-words border-b pb-2 text-gray-800"
                    >
                      {renderQuestion(log.question)}
                      <div className="ml-4 text-green-700">
                        A: {renderAnswer(log.answer)}
                      </div>
                      <div className="ml-4 text-xs text-gray-400">
                        📅 {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="flex justify-center mt-6 space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              前へ
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
