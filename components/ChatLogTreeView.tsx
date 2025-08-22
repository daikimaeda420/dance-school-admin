"use client";

import * as React from "react";
import { useMemo, useState } from "react";

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

// 階層ごとの色
const LEVEL_BG = [
  "bg-amber-50 border-amber-200",
  "bg-emerald-50 border-emerald-200",
  "bg-sky-50 border-sky-200",
  "bg-rose-50 border-rose-200",
  "bg-indigo-50 border-indigo-200",
];
const levelClass = (level: number) =>
  `rounded-lg border ${LEVEL_BG[level % LEVEL_BG.length]}`;

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
        <div className={`p-3 ${levelClass(level)}`}>
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
                    {/* next が {question, answer} 形式でも、文字列でも両対応 */}
                    {renderQuestion(
                      typeof opt.next === "object" && "question" in opt.next
                        ? (opt.next as any).question
                        : opt.next,
                      level + 1
                    )}
                    {(opt.next as any)?.answer && (
                      <div className="mt-2 rounded-md bg-green-50 px-3 py-2 text-green-800 border border-green-200 text-sm">
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
      <div className={`p-3 italic text-gray-500 ${levelClass(level)}`}>
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
      // ページ側のステートを持たないので、再読み込みで反映
      location.reload();
    } catch (e) {
      console.error(e);
      alert("削除に失敗しました（通信エラー）");
    }
  };

  return (
    <div className="p-4">
      {/* コントロールバー */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => {
              setCurrentPage(1);
              setQuery(e.target.value);
            }}
            className="w-64 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            placeholder="セッションID / 質問 / 回答 を検索"
          />
          <select
            className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm"
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
          <button
            onClick={expandAll}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            全て展開
          </button>
          <button
            onClick={collapseAll}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            全て閉じる
          </button>
        </div>
      </div>

      {/* セッション一覧 */}
      {filteredSessions.length === 0 ? (
        <p className="p-6 text-sm text-gray-500">該当するログがありません</p>
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
              <div
                key={id}
                className="rounded-xl border border-gray-200 shadow-soft bg-white"
              >
                <div
                  className="flex cursor-pointer items-center justify-between rounded-t-xl bg-amber-50 px-4 py-3"
                  onClick={() => toggle(id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:gap-3">
                    <div className="text-sm font-semibold text-amber-900">
                      {opened ? "▼" : "▶"} セッションID: {id}
                    </div>
                    <div className="text-xs text-amber-800">
                      {items.length} 件 / {dateRange}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(id);
                      }}
                      className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-amber-800 hover:bg-amber-100"
                    >
                      コピー
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(id);
                      }}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {opened && (
                  <ul className="divide-y divide-gray-100">
                    {items.map((log, i) => (
                      <li key={i} className="p-4">
                        <div className="flex flex-col gap-2">
                          {renderQuestion(log.question, 0)}
                          {log.answer != null && (
                            <div className="mt-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 border border-green-200">
                              A: {renderAnswer(log.answer)}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            📅 {formatDate(log.timestamp)}
                            {log.url && (
                              <>
                                {"  "}・{" "}
                                <a
                                  href={log.url}
                                  className="text-blue-600 hover:underline"
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
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              前へ
            </button>
            <span className="px-2 text-sm text-gray-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
