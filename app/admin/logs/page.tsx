"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";

type FaqLog = {
  school: string;
  question: string;
  answer: string;
  timestamp: string;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<FaqLog[] | null>(null); // ← 初期状態を null に

  useEffect(() => {
    fetch("/api/logs")
      .then((res) => res.json())
      .then((data: FaqLog[]) => {
        const sorted = data.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setLogs(sorted);
      });
  }, []);

  // ✅ Hydration差分回避：nullの間は何も描画しない
  if (logs === null) return null;

  return (
    <div className="">
      <Header />
      <h1 className="">📊 チャットボット利用ログ</h1>

      {logs.length === 0 ? (
        <p>ログはまだありません。</p>
      ) : (
        <div className="">
          <table className="">
            <thead>
              <tr className="">
                <th className="">日時</th>
                <th className="">スクール</th>
                <th className="">質問</th>
                <th className="">回答</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} className="">
                  <td className="">
                    {new Date(log.timestamp).toLocaleString("ja-JP", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="">{log.school}</td>
                  <td className="">{log.question}</td>
                  <td className="">{log.answer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
