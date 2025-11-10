// app/(embed)/embed/chatbot/ChatbotEmbedClient.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCcw } from "lucide-react";
import Image from "next/image";

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

type FAQDocument = {
  school: string;
  version: number;
  updatedAt: string;
  root: FAQItem;
};

type Message = {
  role: "bot" | "user";
  text: string;
  url?: string;
  options?: { label: string; next: FAQItem }[];
};

type ChatbotEmbedClientProps = {
  /** サーバー側（page.tsx）から渡される school ID。なければ URL クエリを参照 */
  school?: string;
};

const PALETTES = new Set([
  "navy",
  "emerald",
  "orange",
  "purple",
  "rose",
  "gray",
]);

/** API のベースURL（常に rizbo を指す） */
function getApiBase() {
  // Vercel に NEXT_PUBLIC_RIZBO_API_ORIGIN を入れていればそれを優先
  const envBase = process.env.NEXT_PUBLIC_RIZBO_API_ORIGIN;
  if (envBase) return envBase.replace(/\/+$/, "");

  // 未設定なら固定で rizbo を使う
  return "https://rizbo.dansul.jp";
}

/** APIレスポンス（配列 or Document）を統一形式(配列)へ */
function normalizeFaq(data: unknown): FAQItem[] {
  try {
    // ① 配列形式
    if (Array.isArray(data)) return data as FAQItem[];

    // ② 新形式（FAQDocument）
    if (data && typeof data === "object") {
      const d = data as any;

      // ✅ 現在のAPI形式（items配列を持つ）
      if (Array.isArray(d.items)) {
        return d.items as FAQItem[];
      }

      // ✅ ドキュメント形式（rootを持つ）
      if (d.root) {
        return [d.root as FAQItem];
      }
    }
  } catch (e) {
    console.warn("normalizeFaq error:", e);
  }
  return [];
}

export default function ChatbotEmbedClient({
  school,
}: ChatbotEmbedClientProps) {
  const params = useSearchParams();

  // props が優先。なければ URL クエリから取得
  const schoolId = school ?? params.get("school") ?? "";
  const theme = (params.get("theme") ?? "light").toLowerCase(); // light|dark
  const paletteParam = (params.get("palette") ?? "navy").toLowerCase();
  const palette = PALETTES.has(paletteParam) ? paletteParam : "navy";

  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const [faq, setFaq] = useState<FAQItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ---- helpers ----
  const bot = (text: string, extras: Partial<Message> = {}): Message => ({
    role: "bot",
    text,
    ...extras,
  });
  const userMsg = (text: string): Message => ({ role: "user", text });

  // ==== session id ====
  const getSessionId = () => {
    if (typeof window === "undefined") return "";
    let sid = localStorage.getItem("sessionId");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("sessionId", sid);
    }
    return sid;
  };

  // ==== ログ送信 ====
  const logToServer = async (
    question: string,
    answer: string = "",
    url: string = ""
  ) => {
    if (!schoolId) return;
    const base = getApiBase();
    if (!base) return;

    const sessionId = getSessionId();
    try {
      await fetch(`${base}/api/logs`, {
        method: "POST",
        mode: "cors",
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

  // ==== FAQ 取得 ====
  useEffect(() => {
    if (!schoolId) {
      console.warn(
        "[rizbo-chatbot] schoolId が空です。?school=xxx もしくは data-rizbo-school が渡っているか確認してください。"
      );
      return;
    }

    let aborted = false;
    const run = async () => {
      const base = getApiBase();
      console.log("[rizbo-chatbot] FAQ fetch start", { base, schoolId });

      try {
        const url1 = `${base}/api/faq?school=${encodeURIComponent(schoolId)}`;
        const r1 = await fetch(url1, { cache: "no-store", mode: "cors" });
        console.log("[rizbo-chatbot] /api/faq?school= status", r1.status);

        if (r1.ok) {
          const d1 = await r1.json();
          if (!aborted) setFaq(normalizeFaq(d1));
          return;
        }

        const url2 = `${base}/api/faq/${encodeURIComponent(schoolId)}`;
        const r2 = await fetch(url2, { cache: "no-store", mode: "cors" });
        console.log("[rizbo-chatbot] /api/faq/:school status", r2.status);

        const d2 = r2.ok ? await r2.json() : null;
        if (!aborted) setFaq(normalizeFaq(d2));
      } catch (e) {
        console.error("[rizbo-chatbot] FAQ取得失敗:", e);
        if (!aborted) setFaq([]);
      }
    };
    run();
    return () => {
      aborted = true;
    };
  }, [schoolId]);

  // ==== 初期メッセージ ====
  useEffect(() => {
    const greet = bot("ご不明な点はありますか？ お気軽にお問合せください。");

    // FAQゼロのときも無言にしない
    if (!faq.length) {
      setMessages([
        greet,
        bot("このスクールのFAQはまだ登録されていないようです。"),
      ]);
      return;
    }

    const first = faq[0];

    if (first?.type === "select" && first.options?.length) {
      setMessages([
        greet,
        ...(first.answer ? [bot(first.answer)] : []),
        bot(first.question, { options: first.options }),
      ]);
      logToServer(first.question, "(選択肢)");
    } else {
      const opts = faq.map((it) => ({ label: it.question, next: it }));
      setMessages([greet, bot("項目をお選びください。", { options: opts })]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faq]);

  // ==== オートスクロール（本文のみ） ====
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // ==== 検索用に全questionを平坦化 ====
  const flat = useMemo(() => {
    const list: { question: string; node: FAQItem }[] = [];
    const walk = (n: FAQItem) => {
      if (n.type === "question")
        list.push({ question: n.question || "", node: n });
      if (n.type === "select") n.options?.forEach((o) => walk(o.next));
    };
    faq.forEach(walk);
    return list;
  }, [faq]);

  // ==== 選択肢クリック ====
  const handleOptionSelect = (option: { label: string; next: FAQItem }) => {
    setMessages((prev) => [...prev, userMsg(option.label)]);
    setTimeout(() => renderFAQ(option.next, false), 120);
  };

  // ==== ノード表示 ====
  const renderFAQ = (item: FAQItem, fromUserClick = true) => {
    if (fromUserClick) {
      setMessages((prev) => [...prev, userMsg(item.question)]);
    }

    if (item.type === "question") {
      setMessages((prev) => [
        ...prev,
        bot(item.answer, { url: item.url }),
        ...makeFollowup(),
      ]);
      logToServer(item.question, item.answer, item.url ?? "");
      return;
    }

    if (item.type === "select") {
      if (item.answer) {
        setMessages((prev) => [...prev, bot(item.answer)]);
      }
      setMessages((prev) => [
        ...prev,
        bot(item.question, { options: item.options || [] }),
      ]);
      logToServer(item.question, "(選択肢)");
    }
  };

  const makeFollowup = (): Message[] => {
    const first = faq[0];
    if (first?.type === "select" && first.options?.length) {
      return [bot("他にもご質問はありますか？", { options: first.options })];
    }
    return [];
  };

  // ==== 入力送信（部分一致検索） ====
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((prev) => [...prev, userMsg(text)]);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const hit =
        flat.find((f) =>
          f.question.toLowerCase().includes(text.toLowerCase())
        ) ?? null;

      if (!hit) {
        const first = faq[0];
        setMessages((prev) => [
          ...prev,
          bot("うまく見つかりませんでした。カテゴリーからお選びください。", {
            ...(first?.type === "select" && first.options?.length
              ? { options: first.options }
              : {}),
          }),
        ]);
        return;
      }
      renderFAQ(hit.node, false);
    }, 140);
  };

  // ==== 右上の× → 親に閉じる通知 ====
  const closeParent = () => {
    window.parent?.postMessage({ type: "RIZBO_CLOSE" }, "*");
  };

  // ==== セッション初期化 ====
  const handleReset = () => {
    setMessages([]);
    localStorage.removeItem("sessionId");
    if (!faq.length) return;

    const first = faq[0];
    const greet = bot("ご不明な点はありますか？ お気軽にお問合せください。");

    if (first?.type === "select" && first.options?.length) {
      setMessages([
        greet,
        ...(first.answer ? [bot(first.answer)] : []),
        bot(first.question, { options: first.options }),
      ]);
    } else {
      const opts = faq.map((it) => ({ label: it.question, next: it }));
      setMessages([greet, bot("項目をお選びください。", { options: opts })]);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`rzw-root rzw-theme-${palette} ${
        theme === "dark" ? "rzw-dark" : ""
      }`}
    >
      <div className="rzw-card">
        {/* ヘッダー */}
        <header className="rzw-head">
          <div className="rzw-head-left">
            <Image
              src="/outline-logo-w.svg"
              alt="サイトロゴ"
              width={96}
              height={20}
              className="rzw-logo"
              priority
            />
          </div>
          <div className="rzw-head-actions">
            <button
              className="rzw-reset"
              title="再スタート"
              aria-label="再スタート"
              onClick={handleReset}
            >
              <RefreshCcw width={18} height={18} />
            </button>
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
          </div>
        </header>

        {/* 本文（メッセージ） */}
        <main ref={bodyRef} className="rzw-body">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rzw-row ${
                m.role === "user" ? "rzw-right" : "rzw-left"
              }`}
            >
              {m.role === "bot" && (
                <img
                  src="/apple-touch-icon.png"
                  width={22}
                  height={22}
                  alt="サイトロゴ"
                  className="logo-icon"
                />
              )}
              <div className={`rzw-bubble ${m.role === "user" ? "out" : "in"}`}>
                <div className="rzw-text">{m.text}</div>

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
            <div className="rzw-row rzw-left">
              <div className="rzw-mini-avatar" />
              <div className="rzw-bubble in">
                <span className="rzw-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          )}
        </main>

        {/* 入力欄 */}
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
        /* -------- スコープされたCSS変数（デフォルト: navy） -------- */
        .rzw-root {
          --rz-primary: #2f5c7a;
          --rz-bg: #f6f8fb;
          --rz-bubble-in: #e9f2f8;
          --rz-bubble-out: #2f5c7a;
          --rz-text-in: #2b3950;
          --rz-text-out: #ffffff;
          --rz-border: #d7dee6;
          color: #000;
        }
        /* palette: emerald */
        .rzw-theme-emerald {
          --rz-primary: #0f766e;
          --rz-bg: #f5fbfa;
          --rz-bubble-in: #e6f7f5;
          --rz-bubble-out: #0f766e;
          --rz-text-in: #11423e;
          --rz-text-out: #ffffff;
          --rz-border: #cfe9e5;
        }
        /* palette: orange */
        .rzw-theme-orange {
          --rz-primary: #ea580c;
          --rz-bg: #fff8f3;
          --rz-bubble-in: #fff2e8;
          --rz-bubble-out: #ea580c;
          --rz-text-in: #5b3219;
          --rz-text-out: #ffffff;
          --rz-border: #f4d3bf;
        }
        /* palette: purple */
        .rzw-theme-purple {
          --rz-primary: #6d28d9;
          --rz-bg: #faf5ff;
          --rz-bubble-in: #f3e8ff;
          --rz-bubble-out: #6d28d9;
          --rz-text-in: #3e1a71;
          --rz-text-out: #ffffff;
          --rz-border: #e1ccfa;
        }
        /* palette: rose */
        .rzw-theme-rose {
          --rz-primary: #be123c;
          --rz-bg: #fff6f8;
          --rz-bubble-in: #ffe8ee;
          --rz-bubble-out: #be123c;
          --rz-text-in: #5c1222;
          --rz-text-out: #ffffff;
          --rz-border: #f2c4d0;
        }
        /* palette: gray */
        .rzw-theme-gray {
          --rz-primary: #374151;
          --rz-bg: #f7fafc;
          --rz-bubble-in: #eef2f7;
          --rz-bubble-out: #374151;
          --rz-text-in: #1f2937;
          --rz-text-out: #ffffff;
          --rz-border: #d1d5db;
        }

        /* ---- ダークモード ---- */
        .rzw-dark.rzw-theme-navy {
          --rz-bg: #0f1720;
          --rz-bubble-in: #1b2a38;
          --rz-bubble-out: #345f7d;
          --rz-text-in: #dbe6ef;
          --rz-border: #233446;
        }
        .rzw-dark.rzw-theme-emerald {
          --rz-bg: #071615;
          --rz-bubble-in: #123b38;
          --rz-bubble-out: #147d74;
          --rz-text-in: #d2f2ee;
          --rz-border: #1d2b29;
        }
        .rzw-dark.rzw-theme-orange {
          --rz-bg: #140d09;
          --rz-bubble-in: #2a1a12;
          --rz-bubble-out: #f97316;
          --rz-text-in: #fde4d4;
          --rz-border: #3a2418;
        }
        .rzw-dark.rzw-theme-purple {
          --rz-bg: #0e0a17;
          --rz-bubble-in: #251842;
          --rz-bubble-out: #7c3aed;
          --rz-text-in: #eaddff;
          --rz-border: #33245a;
        }
        .rzw-dark.rzw-theme-rose {
          --rz-bg: #14080c;
          --rz-bubble-in: #2b0f18;
          --rz-bubble-out: #e11d48;
          --rz-text-in: #ffd9e1;
          --rz-border: #3a1a25;
        }
        .rzw-dark.rzw-theme-gray {
          --rz-bg: #0b1117;
          --rz-bubble-in: #1f2937;
          --rz-bubble-out: #4b5563;
          --rz-text-in: #e5e7eb;
          --rz-border: #2b3745;
        }

        /* ---------- layout ---------- */
        .rzw-root {
          width: 100%;
          height: 100%;
          background: transparent;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
        }
        .rzw-card {
          height: 100dvh;
          width: 100%;
          background: #fff;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: none;
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
        .rzw-head-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .rzw-reset,
        .rzw-x {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          color: #fff;
        }
        .rzw-x:hover,
        .rzw-reset:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .rzw-body {
          flex: 1;
          background: var(--rz-bg);
          padding: 12px;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          scrollbar-gutter: stable;
        }
        .rzw-row {
          display: flex;
          margin-bottom: 10px;
          gap: 8px;
        }
        .rzw-left {
          justify-content: flex-start;
        }
        .rzw-right {
          justify-content: flex-end;
        }
        .rzw-mini-avatar,
        .logo-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #d9e1e8;
          align-self: flex-start;
        }
        .rzw-bubble {
          max-width: 85%;
          border-radius: 12px;
          padding: 10px 12px;
          line-height: 1.5;
          border: 1px solid transparent;
        }
        .rzw-bubble.in {
          background: var(--rz-bubble-in);
          color: var(--rz-text-in);
          border-color: rgba(0, 0, 0, 0.02);
        }
        .rzw-bubble.out {
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

        .rzw-logo {
          height: 18px;
          width: auto;
          display: block;
        }
        @media (max-width: 360px) {
          .rzw-logo {
            max-width: 120px;
          }
        }
      `}</style>

      {/* 親(body)のスクロールを止める */}
      <style jsx global>{`
        html,
        body,
        #__next {
          height: 100%;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
