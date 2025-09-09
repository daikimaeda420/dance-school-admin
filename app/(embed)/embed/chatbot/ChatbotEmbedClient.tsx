// app/(embed)/embed/chatbot/ChatbotEmbedClient.tsx
"use client";
import { useEffect, useRef } from "react";

export default function ChatbotEmbedClient() {
  const bodyRef = useRef<HTMLDivElement>(null);

  // 親へ高さ通知（インライン埋め込み時の互換用）
  useEffect(() => {
    const post = () => {
      const h = bodyRef.current?.scrollHeight ?? 600;
      window.parent?.postMessage({ type: "RIZBO_RESIZE", height: h }, "*");
    };
    post();
    const ro = new ResizeObserver(post);
    if (bodyRef.current) ro.observe(bodyRef.current);
    return () => ro.disconnect();
  }, []);

  const closeParent = () => {
    window.parent?.postMessage({ type: "RIZBO_CLOSE" }, "*");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 既存の送信処理に差し替え
  };

  return (
    <div className="rzw-root" ref={bodyRef}>
      <div className="rzw-card">
        <header className="rzw-head">
          <div className="rzw-head-left">
            <div className="rzw-avatar" />
            <div className="rzw-title">前田 大輝</div>
          </div>
          <button className="rzw-x" aria-label="閉じる" onClick={closeParent}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <main className="rzw-body">
          {/* ▼ ここに既存メッセージをレンダリング */}
          <div className="rzw-msg rzw-msg-in">
            <div className="rzw-bubble">
              ご不明な点はありますか？ お気軽にお問合せください。
            </div>
          </div>
          {/* ▲ 例 */}
        </main>

        <form className="rzw-input" onSubmit={submit}>
          <input className="rzw-field" placeholder="何でもご依頼ください..." />
          <button className="rzw-send" aria-label="送信">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M3 20l18-8L3 4l4 6 6 2-6 2-4 6z" fill="currentColor" />
            </svg>
          </button>
        </form>
      </div>

      <style jsx>{`
        .rzw-root {
          width: 100%;
          height: 100%;
          background: transparent;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
        }
        .rzw-card {
          width: 100%;
          height: 100%;
          background: #fff;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .rzw-head {
          background: #2f5c7a;
          color: #fff;
          padding: 12px 12px 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .rzw-head-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .rzw-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #d9e1e8;
        }
        .rzw-title {
          font-weight: 700;
        }
        .rzw-x {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
        }
        .rzw-x:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .rzw-body {
          flex: 1;
          background: #f6f8fb;
          padding: 12px 12px 0;
          overflow: auto;
        }
        .rzw-msg {
          display: flex;
          margin-bottom: 10px;
        }
        .rzw-msg-in {
          justify-content: flex-start;
        }
        .rzw-bubble {
          background: #e9f2f8;
          color: #2b3950;
          border-radius: 10px;
          padding: 10px 12px;
          max-width: 85%;
        }
        .rzw-input {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 12px;
          background: #fff;
          border-top: 1px solid #e5e7eb;
        }
        .rzw-field {
          flex: 1;
          min-height: 40px;
          border: 1px solid #d7dee6;
          border-radius: 999px;
          padding: 0 42px 0 14px;
          outline: none;
        }
        .rzw-field::placeholder {
          color: #9aa7b6;
        }
        .rzw-send {
          margin-left: -40px;
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          color: #2f5c7a;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
