"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

// ===== Types =====
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

type Message =
  | {
      id: string;
      role: "bot";
      text: string;
      options?: QuickReply[];
      url?: string;
    }
  | { id: string; role: "user"; text: string };

type QuickReply = { label: string; path: string }; // path = "0.options.1.next" など

// ===== Utils =====
const uid = () => Math.random().toString(36).slice(2);

function pathToArray(path: string) {
  // "0.options.1.next" -> ["0","options","1","next"]
  return path.split(".").map((k) => (k.match(/^\d+$/) ? Number(k) : k));
}

function getNodeByPath(items: FAQItem[], path: string): FAQItem | null {
  try {
    const keys = pathToArray(path);
    let cur: any = items;
    for (const k of keys) cur = cur[k];
    return cur ?? null;
  } catch {
    return null;
  }
}

function flatten(items: FAQItem[]) {
  // 検索用：全 question を収集
  const list: {
    question: string;
    answer?: string;
    url?: string;
    path: string;
    type: FAQItem["type"];
  }[] = [];
  const walk = (node: FAQItem, path: (number | string)[]) => {
    if (node.type === "question") {
      list.push({
        question: node.question || "",
        answer: node.answer,
        url: node.url,
        path: path.join("."),
        type: "question",
      });
    } else {
      list.push({
        question: node.question || "",
        path: path.join("."),
        type: "select",
      });
      node.options?.forEach((opt, i) =>
        walk(opt.next, [...path, "options", i, "next"])
      );
    }
  };
  items.forEach((it, i) => walk(it, [i]));
  return list;
}

function ensureSessionId() {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem("sessionId");
  if (!sid) {
    sid = `s_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    localStorage.setItem("sessionId", sid);
  }
  return sid;
}

// ===== Component =====
export default function ChatbotEmbedClient() {
  const params = useSearchParams();
  const school = params.get("school") ?? "";
  const theme = params.get("theme") ?? "light";

  const rootRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [faq, setFaq] = useState<FAQItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sessionId = useMemo(() => ensureSessionId(), []);
  const flat = useMemo(() => flatten(faq), [faq]);

  // ===== resize to parent (inline互換) =====
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

  // ===== auto-scroll =====
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // ===== load FAQ =====
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/faq?school=${encodeURIComponent(school)}`
        );
        const data = (await res.json()) as FAQItem[] | null;
        setFaq(Array.isArray(data) ? data : []);
      } catch {
        setFaq([]);
      }
    })();
  }, [school]);

  // ===== greet =====
  useEffect(() => {
    if (!faq.length) return;
    // 最初のメッセージ
    const greet: Message = {
      id: uid(),
      role: "bot",
      text: "ご不明な点はありますか？ お気軽にお問合せください。",
    };

    // トップが select の場合はその選択肢をクイックリプライに
    let options: QuickReply[] | undefined;
    const top = faq[0];
    if (top && top.type === "select" && top.options?.length) {
      options = top.options.map((opt, i) => ({
        label: opt.label || "(選択肢)",
        path: `0.options.${i}.next`,
      }));
    }

    setMessages(options ? [{ ...greet, options }] : [greet]);
  }, [faq]);

  // ===== logging (best-effort) =====
  const log = async (payload: {
    question: string;
    answer?: string;
    url?: string;
  }) => {
    try {
      await fetch(`/api/faq-log?school=${encodeURIComponent(school)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          timestamp: new Date().toISOString(),
          ...payload,
        }),
      });
    } catch {
      // 無視（存在しない環境でも落ちないように）
    }
  };

  // ===== reply helpers =====
  const showSelect = (node: Extract<FAQItem, { type: "select" }>) => {
    const opts: QuickReply[] = node.options.map((opt, i) => ({
      label: opt.label || "(選択肢)",
      path: `__CURRENT__.options.${i}.next`, // __CURRENT__ は直後で差し替え
    }));

    // nodeのpathを探す
    const hit = flat.find(
      (f) => f.path && f.path.length && f.question === node.question
    );
    const basePath = hit?.path ?? ""; // 例: "0"
    const fixedOpts = opts.map((o) => ({
      ...o,
      path: o.path.replace("__CURRENT__", basePath),
    }));

    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: "bot",
        text: node.question || "お選びください。",
        options: fixedOpts,
      },
    ]);
  };

  const answerQuestion = (q: string, a?: string, url?: string) => {
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "bot", text: a || "回答が見つかりました。", url },
      {
        id: uid(),
        role: "bot",
        text: "他にもご質問はありますか？",
        options: makeTopOptions(),
      },
    ]);
    log({ question: q, answer: a, url }).catch(() => {});
  };

  const makeTopOptions = (): QuickReply[] | undefined => {
    const top = faq[0];
    if (top && top.type === "select" && top.options?.length) {
      return top.options.map((opt, i) => ({
        label: opt.label || "(選択肢)",
        path: `0.options.${i}.next`,
      }));
    }
    return undefined;
  };

  // ===== user actions =====
  const onQuickReply = (qr: QuickReply) => {
    // 1) ユーザが選んだ表示
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", text: qr.label },
    ]);

    // 2) 次ノードに進む
    const next = getNodeByPath(faq, qr.path);
    if (!next) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "bot",
          text: "すみません、該当の項目が見つかりませんでした。",
        },
      ]);
      return;
    }
    if (next.type === "question") {
      answerQuestion(next.question, next.answer, next.url);
    } else {
      showSelect(next);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", text }]);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      // 部分一致で question を検索
      const hit =
        flat.find(
          (f) =>
            f.type === "question" &&
            f.question?.toLowerCase().includes(text.toLowerCase())
        ) ||
        flat.find((f) =>
          f.question?.toLowerCase().includes(text.toLowerCase())
        );

      if (!hit) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "bot",
            text: "うまく見つかりませんでした。カテゴリーからお選びいただくか、別のキーワードでお試しください。",
            options: makeTopOptions(),
          },
        ]);
        return;
      }

      // hit が question の場合はその回答、select の場合は選択肢提示
      const node = getNodeByPath(faq, hit.path);
      if (!node) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "bot",
            text: "該当の項目が見つかりませんでした。",
          },
        ]);
        return;
      }
      if (node.type === "question") {
        answerQuestion(node.question, node.answer, (node as any).url);
      } else {
        showSelect(node);
      }
    }, 150); // 疑似待機で自然に
  };

  // ===== close bubble =====
  const closeParent = () => {
    window.parent?.postMessage({ type: "RIZBO_CLOSE" }, "*");
  };

  // ===== render =====
  return (
    <div
      ref={rootRef}
      className={`rzw-root ${theme === "dark" ? "rzw-dark" : ""}`}
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
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rzw-msg ${
                m.role === "user" ? "rzw-msg-out" : "rzw-msg-in"
              }`}
            >
              <div
                className={`rzw-bubble ${
                  m.role === "user" ? "rzw-bubble-out" : "rzw-bubble-in"
                }`}
              >
                <p
                  dangerouslySetInnerHTML={{
                    __html: escapeHtml(m.text).replace(/\n/g, "<br>"),
                  }}
                />
                {m.url && (
                  <p className="rzw-link">
                    <a href={m.url} target="_blank" rel="noopener noreferrer">
                      くわしく見る ↗
                    </a>
                  </p>
                )}
                {m.role === "bot" && m.options?.length ? (
                  <div className="rzw-qr">
                    {m.options.map((o, i) => (
                      <button
                        key={i}
                        className="rzw-chip"
                        onClick={() => onQuickReply(o)}
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

        {/* Input */}
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
          color: #111827;
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
          border-color: transparent;
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
      `}</style>
    </div>
  );
}

// ===== tiny HTML escape =====
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
