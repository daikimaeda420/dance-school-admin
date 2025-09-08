// components/ChatLogTreeView.tsx 置き換え
"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { ChevronDown, Trash2, Clock } from "lucide-react";

type SelectOption = { label: string; next?: any };
type FaqQuestion =
  | string
  | { type: "select"; text: string; options: SelectOption[] };

type FaqLog = {
  sessionId?: string;
  timestamp: string;
  question: FaqQuestion;
  answer?: any;
  url?: string;
};
type Props = { logs: FaqLog[] };

const ITEMS_PER_PAGE_DEFAULT = 5;

/* 階層ごとの色（ダーク対応） */
const LEVEL_BG = [
  "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700",
  "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700",
  "bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-700",
  "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-700",
  "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-700",
];
const levelClass = (level: number) => `rounded-lg `;

export default function ChatLogTreeView({ logs }: Props) {
  // セッションにグルーピング＆最新順
  const sessionEntries = useMemo(() => {
    const map = new Map<string, FaqLog[]>();
    (logs || []).forEach((log) => {
      const id = log.sessionId || "unknown";
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(log);
    });
    const entries = Array.from(map.entries()).map(([id, arr]) => [
      id,
      arr.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    ]) as [string, FaqLog[]][];

    // セッション自体も最新のログ時刻で並べる
    return entries.sort((a, b) => {
      const ta = new Date(a[1][0]?.timestamp || 0).getTime();
      const tb = new Date(b[1][0]?.timestamp || 0).getTime();
      return tb - ta;
    });
  }, [logs]);

  // UI state
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE_DEFAULT);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredSessions = useMemo(() => {
    if (!query) return sessionEntries;
    const q = query.toLowerCase();
    return sessionEntries.filter(([id, items]) => {
      if (id.toLowerCase().includes(q)) return true;
      return items.some((l) => {
        const qs =
          typeof l.question === "string" ? l.question : l.question?.text || "";
        return (
          (qs && qs.toLowerCase().includes(q)) ||
          (typeof l.answer === "string" && l.answer.toLowerCase().includes(q))
        );
      });
    });
  }, [query, sessionEntries]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const pageSessions = filteredSessions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggle = (id: string) => {
    const s = new Set(openIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setOpenIds(s);
  };
  const expandAll = () =>
    setOpenIds(new Set(filteredSessions.map(([id]) => id)));
  const collapseAll = () => setOpenIds(new Set());

  const formatDate = (d: string) =>
    new Date(d).toLocaleString(undefined, { hour12: false });
  const renderAnswer = (a: any): string => {
    if (a == null) return "-";
    if (typeof a === "string") return a;
    try {
      return JSON.stringify(a);
    } catch {
      return String(a);
    }
  };

  const renderQuestion = (q: FaqQuestion, level = 0): React.ReactElement => {
    if (typeof q === "string") {
      return (
        <div className={`p-3 bg-gray-50 dark:bg-gray-800 rounded-md`}>
          <div className="font-semibold">Q: {q}</div>
        </div>
      );
    }
    if (q && typeof q === "object" && q.type === "select") {
      return (
        <div className={`p-3 space-y-3 ${levelClass(level)}`}>
          <div className="font-semibold">Q: {q.text}</div>
          <ul className="space-y-2">
            {q.options?.map((opt, idx) => (
              <li key={idx} className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">選択肢:</span> {opt.label}
                </div>
                {opt.next && (
                  <div className="ml-3">
                    {renderQuestion(
                      typeof opt.next === "object" && "question" in opt.next
                        ? (opt.next as any).question
                        : opt.next,
                      level + 1
                    )}
                    {(opt.next as any)?.answer && (
                      <div className="mt-2 rounded-md bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200 px-3 py-2 text-sm">
                        A: {renderAnswer((opt.next as any).answer)}
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
    return (
      <div
        className={`p-3 italic text-gray-500 dark:text-gray-400 ${levelClass(
          level
        )}`}
      >
        (不明な質問形式)
      </div>
    );
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
      location.reload();
    } catch {
      alert("削除に失敗しました（通信エラー）");
    }
  };

  return (
    <div className="p-4">
      {/* コントロールバー */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between ">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => {
              setCurrentPage(1);
              setQuery(e.target.value);
            }}
            className="input w-64"
            placeholder="セッションID / 質問 / 回答 を検索"
          />
          <select
            className="input w-36"
            value={pageSize}
            onChange={(e) => {
              setCurrentPage(1);
              setPageSize(Number(e.target.value));
            }}
          >
            {[5, 10, 20].map((n) => (
              <option key={n} value={n}>
                {n}件/ページ
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={expandAll} className="btn-ghost">
            全て展開
          </button>
          <button onClick={collapseAll} className="btn-ghost">
            全て閉じる
          </button>
        </div>
      </div>

      {/* セッション一覧 */}
      {filteredSessions.length === 0 ? (
        <p className="p-6 text-sm text-gray-500 dark:text-gray-400">
          該当するログがありません
        </p>
      ) : (
        <div className="space-y-4">
          {pageSessions.map(([id, items]) => {
            const opened = openIds.has(id);
            const dateRange = `${new Date(
              items[items.length - 1]?.timestamp || items[0]?.timestamp
            ).toLocaleDateString()} 〜 ${new Date(
              items[0]?.timestamp
            ).toLocaleDateString()}`;

            return (
              <div key={id} className="card overflow-hidden">
                {/* ヘッダー */}
                <div
                  className="flex cursor-pointer items-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-3 justify-between"
                  onClick={() => toggle(id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:gap-3">
                    <div className="text-sm font-semibold">
                      セッションID: {id}
                    </div>
                    <div className="text-xs">
                      {items.length} 件 / {dateRange}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(id);
                      }}
                      className="btn-ghost text-xs bg-white dark:bg-gray-900 border border-gray-500 dark:border-gray-500"
                    >
                      コピー
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg
              border dark:border-gray-500
              ring-1 ring-inset ring-gray-500 dark:ring-gray-500
              bg-red-600 px-2.5 py-2 text-xs font-medium text-white hover:bg-red-700"
                      title="削除"
                    >
                      <Trash2 size={14} />
                      <span className="hidden sm:inline">削除</span>
                    </button>
                    {/* 矢印 */}
                    <Clock
                      size={20}
                      className={`shrink-0 transition-transform duration-200 ${
                        opened ? "rotate-180" : ""
                      } text-gray-600 dark:text-gray-300`}
                      aria-hidden
                    />
                  </div>
                </div>

                {/* 本文 */}
                {opened && (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map((log, i) => (
                      <li key={i} className="p-4">
                        <div className="flex flex-col gap-2">
                          {renderQuestion(log.question, 0)}
                          {log.answer != null && (
                            <div className="mt-2 rounded-md border border-gray-200 px-3 py-2 text-sm">
                              A: {renderAnswer(log.answer)}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-2 items-center">
                            <Clock aria-hidden="true" className="w-4 h-4" />
                            {formatDate(log.timestamp)}
                            {log.url && (
                              <>
                                {"  "}・{" "}
                                <a
                                  href={log.url}
                                  className="text-blue-600 dark:text-blue-300 hover:underline"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  参照リンク
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          {/* ページャ */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-ghost disabled:opacity-50"
            >
              前へ
            </button>
            <span className="px-2 text-sm text-gray-700 dark:text-gray-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-ghost disabled:opacity-50"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
