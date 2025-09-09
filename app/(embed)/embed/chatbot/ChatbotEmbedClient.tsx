// app/(embed)/embed/chatbot/ChatbotEmbedClient.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
      answer?: string;
      options: { label: string; next: FAQItem }[];
    };

type Message = {
  role: "bot" | "user";
  text: string;
  url?: string;
  options?: { label: string; next: FAQItem }[];
};

export default function ChatbotEmbedClient() {
  const params = useSearchParams();
  const schoolId = params.get("school") ?? "";
  const theme = (params.get("theme") ?? "light").toLowerCase(); // light|dark

  const rootRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [faq, setFaq] = useState<FAQItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // --- session id を確保（従来ロジック踏襲） ---
  const getSessionId = () => {
    if (typeof window === "undefined") return "";
    let sid = localStorage.getItem("sessionId");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("sessionId", sid);
    }
    return sid;
  };

  // --- ログ送信（従来の /api/logs を利用） ---
  const logToServer = async (
    question: string,
    answer: string = "",
    url: string = ""
  ) => {
    if (!schoolId) return;
    const sessionId = getSessionId();
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school: schoolId,
          sessionId,
          question,
          answer,
          url,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("ログ送信失敗:", err);
    }
  };

  // --- FAQ 取得 ---
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/faq?school=${encodeURIComponent(schoolId)}`
        );
        const data = (await res.json()) as FAQItem[] | null;
        setFaq(Array.isArray(data) ? data : []);
      } catch {
        setFaq([]);
      }
    })();
  }, [schoolId]);

  // --- 初期メッセージ（トップが select の場合は選択肢提示） ---
  useEffect(() => {
    if (!faq.length) return;
    const top = faq[0];
    const greet: Message = {
      role: "bot",
      text: "ご不明な点はありますか？ お気軽にお問合せください。",
    };
    if (top?.type === "select" && top.options?.length) {
      setMessages([
        greet,
        ...(top.answer
          ? ([{ role: "bot", text: top.answer }] as Message[])
          : []),
        { role: "bot", text: top.question, options: top.options },
      ]);
      logToServer(top.question, "(選択肢)");
    } else {
      setMessages([greet]);
    }
  }, [faq]);

  // --- 親へ高さ通知（ローダーの自動リサイズ互換） ---
  useEffect(() => {
    const postResize = () => {
      const h = rootRef.current?.scrollHeight ?? 600;
      window.parent?.postMessage({ type: "RIZBO_RESIZE", height: h }, "*");
    };
    postResize();
    const ro = new ResizeObserver(postResize);
    if (rootRef.current) ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, []);

  // --- オートスクロール ---
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // --- ユーザが選択肢をクリック ---
  const handleOptionSelect = (option: { label: string; next: FAQItem }) => {
    setMessages((prev) => [...prev, { role: "user", text: option.label }]);
    setTimeout(() => renderFAQ(option.next, false), 120);
  };

  // --- FAQノードを描画（従来ロジックを拡張） ---
  const renderFAQ = (item: FAQItem, fromUserClick: boolean = true) => {
    if (!item) return;
    if (fromUserClick) {
      setMessages((prev) => [...prev, { role: "user", text: item.question }]);
    }

    if (item.type === "question") {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: item.answer, url: item.url },
        // 追質問の導線を軽く提示
        ...makeTopFollowup(),
      ]);
      logToServer(item.question, item.answer, item.url ?? "");
      return;
    }

    // select
    if (item.answer) {
      setMessages((prev) => [...prev, { role: "bot", text: item.answer }]);
    }
    setMessages((prev) => [
      ...prev,
      { role: "bot", text: item.question, options: item.options || [] },
    ]);
    logToServer(item.question, "(選択肢)");
  };

  // --- 画面下「再スタート」相当（セッションもリセット） ---
  const handleReset = () => {
    setMessages([]);
    localStorage.removeItem("sessionId");
    // 初期案内を再生成
    if (!faq.length) return;
    const top = faq[0];
    const greet: Message = {
      role: "bot",
      text: "ご不明な点はありますか？ お気軽にお問合せください。",
    };
    if (top?.type === "select" && top.options?.length) {
      setMessages([
        greet,
        ...(top.answer
          ? ([{ role: "bot", text: top.answer }] as Message[])
          : []),
        { role: "bot", text: top.question, options: top.options },
      ]);
    } else {
      setMessages([greet]);
    }
  };

  // --- FAQを平坦化（簡易検索用） ---
  const flat = useMemo(() => {
    const list: { question: string; node: FAQItem }[] = [];
    const walk = (node: FAQItem) => {
      if (node.type === "question")
        list.push({ question: node.question || "", node });
      if (node.type === "select") node.options?.forEach((o) => walk(o.next));
    };
    faq.forEach(walk);
    return list;
  }, [faq]);

  // --- テキスト送信（部分一致検索） ---
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const hit =
        flat.find((f) =>
          f.question.toLowerCase().includes(text.toLowerCase())
        ) ?? null;

      if (!hit) {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: "うまく見つかりませんでした。カテゴリーからお選びいただくか、別のキーワードでお試しください。",
            ...(faq[0]?.type === "select" && faq[0].options?.length
              ? { options: faq[0].options }
              : {}),
          },
        ]);
        return;
      }
      renderFAQ(hit.node, false);
    }, 140);
  };

  // --- 右上の「×」で親に閉じる通知 ---
  const closeParent = () => {
    window.parent?.postMessage({ type: "RIZBO_CLOSE" }, "*");
  };

  // --- 追質問の導線を生成（トップが select のとき） ---
  const makeTopFollowup = (): Message[] => {
    const top = faq[0];
    if (top?.type === "select" && top.options?.length) {
      return [
        {
          role: "bot",
          text: "他にもご質問はありますか？",
          options: top.options,
        },
      ];
    }
    return [];
  };

  // ===== Render =====
  return (
    <div
      ref={rootRef}
      className={`rzw-root ${theme === "dark" ? "rzw-dark" : ""}`}
      style={{ color: "#000" }} // 文字は黒基調
    >
      <div className="rzw-card">
        {/* Header */}
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

        {/* Body */}
        <main className="rzw-body">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rzw-msg ${
                m.role === "user" ? "rzw-msg-out" : "rzw-msg-in"
              }`}
            >
              <div
                className={`rzw-bubble ${
                  m.role === "user" ? "rzw-bubble-out" : "rzw-bubble-in"
                }`}
              >
                <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>

                {m.url?.trim() && (
                  <p className="rzw-link">
                    <a href={m.url} target="_blank" rel="noopener noreferrer">
                      くわしく見る ↗
                    </a>
                  </p>
                )}

                {m.role === "bot" && m.options?.length ? (
                  <div className="rzw-qr">
                    {m.options.map((o, j) => (
                      <button
                        key={j}
                        className="rzw-chip"
                        onClick={() => handleOptionSelect(o)}
                      >
                        {o.label || "選択"}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {loading && (
            <div className="rzw-msg rzw-msg-in">
              <div className="rzw-bubble rzw-bubble-in">
                <span className="rzw-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </main>

        {/* Input / Controls */}
        <div className="rzw-controls">
          <button
            className="rzw-reset"
            onClick={handleReset}
            title="再スタート"
          >
            🔁
          </button>
        </div>
        <form className="rzw-input" onSubmit={onSubmit}>
          <input
            className="rzw-field"
            placeholder="何でもご依頼ください..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            className="rzw-send"
            aria-label="送信"
            disabled={!input.trim()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M3 20l18-8L3 4l4 6 6 2-6 2-4 6z" fill="currentColor" />
            </svg>
          </button>
        </form>
      </div>

      <style jsx>{`
        :global(:root) {
          --rz-primary: #2f5c7a;
          --rz-bg: #f6f8fb;
          --rz-bubble-in: #e9f2f8;
          --rz-bubble-out: #2f5c7a;
          --rz-text-in: #2b3950;
          --rz-text-out: #fff;
          --rz-border: #d7dee6;
        }
        .rzw-dark :global(:root) {
          --rz-bg: #0f1720;
          --rz-bubble-in: #1b2a38;
          --rz-bubble-out: #345f7d;
          --rz-text-in: #dbe6ef;
          --rz-text-out: #fff;
          --rz-border: #233446;
        }
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
          background: var(--rz-primary);
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
          background: var(--rz-bg);
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
        .rzw-msg-out {
          justify-content: flex-end;
        }
        .rzw-bubble {
          border-radius: 12px;
          padding: 10px 12px;
          max-width: 85%;
          border: 1px solid transparent;
          word-break: break-word;
          line-height: 1.5;
        }
        .rzw-bubble-in {
          background: var(--rz-bubble-in);
          color: var(--rz-text-in);
          border-color: rgba(0, 0, 0, 0.02);
        }
        .rzw-bubble-out {
          background: var(--rz-bubble-out);
          color: var(--rz-text-out);
        }
        .rzw-link {
          margin-top: 6px;
          font-size: 12px;
        }
        .rzw-link a {
          color: inherit;
          text-decoration: underline;
        }
        .rzw-qr {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .rzw-chip {
          border: 1px solid var(--rz-border);
          background: #fff;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        .rzw-chip:hover {
          border-color: var(--rz-primary);
        }
        .rzw-controls {
          display: flex;
          justify-content: flex-end;
          padding: 8px 12px 0;
        }
        .rzw-reset {
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 16px;
        }
        .rzw-input {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 12px;
          background: #fff;
          border-top: 1px solid var(--rz-border);
        }
        .rzw-field {
          flex: 1;
          min-height: 40px;
          border: 1px solid var(--rz-border);
          border-radius: 999px;
          padding: 0 42px 0 14px;
          outline: none;
          background: #fff;
          color: #000;
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
          color: var(--rz-primary);
          cursor: pointer;
        }
        .rzw-dots {
          display: inline-flex;
          gap: 4px;
          align-items: center;
        }
        .rzw-dots i {
          width: 6px;
          height: 6px;
          background: #9db5c7;
          border-radius: 50%;
          display: inline-block;
          animation: rzwBlink 1.2s infinite ease-in-out;
        }
        .rzw-dots i:nth-child(2) {
          animation-delay: 0.2s;
        }
        .rzw-dots i:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes rzwBlink {
          0%,
          80%,
          100% {
            opacity: 0.3;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }
      `}</style>
    </div>
  );
}
