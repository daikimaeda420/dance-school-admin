"use client";

import { useEffect, useState } from "react";

// ログの型
type FaqLog = {
  school: string;
  question: string;
  answer: string;
  timestamp: string;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<FaqLog[]>([]);

  useEffect(() => {
    fetch("/api/logs")
      .then((res) => res.json())
      .then((data: FaqLog[]) => {
        // 日付の降順にソート
        const sorted = data.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setLogs(sorted);
      });
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📊 チャットボット利用ログ</h1>

      {logs.length === 0 ? (
        <p>ログはまだありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">日時</th>
                <th className="p-2 border">スクール</th>
                <th className="p-2 border">質問</th>
                <th className="p-2 border">回答</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-2 border">
                    {new Date(log.timestamp).toLocaleString("ja-JP", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="p-2 border">{log.school}</td>
                  <td className="p-2 border">{log.question}</td>
                  <td className="p-2 border">{log.answer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
