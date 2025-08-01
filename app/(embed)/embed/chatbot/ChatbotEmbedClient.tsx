"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";

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

export default function ChatbotEmbedClient() {
  const params = useSearchParams();
  const schoolId = params.get("school") ?? "";
  const [faq, setFaq] = useState<FAQItem[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const getSessionId = () => {
    if (typeof window === "undefined") return "";
    let sid = localStorage.getItem("sessionId");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("sessionId", sid);
    }
    return sid;
  };

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

  useEffect(() => {
    if (!schoolId) return;
    fetch(`/api/faq?school=${schoolId}`)
      .then((res) => res.json())
      .then(setFaq);
  }, [schoolId]);

  const renderFAQ = (item: FAQItem, fromUserClick: boolean = true) => {
    if (!item || typeof item !== "object" || !("question" in item)) return;

    if (fromUserClick) {
      setMessages((prev) => [...prev, { role: "user", text: item.question }]);
    }

    if (item.type === "question") {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: item.answer, url: item.url },
      ]);
      logToServer(item.question, item.answer, item.url ?? "");
    } else if (item.type === "select") {
      if (item.answer) {
        setMessages((prev) => [...prev, { role: "bot", text: item.answer }]);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: item.question,
          options: item.options,
        },
      ]);
      logToServer(item.question, "(選択肢)");
    }
  };

  const handleOptionSelect = (option: { label: string; next: FAQItem }) => {
    setMessages((prev) => [...prev, { role: "user", text: option.label }]);
    setTimeout(() => {
      renderFAQ(option.next, false);
    }, 100);
  };

  const handleReset = () => {
    setMessages([]);
    localStorage.removeItem("sessionId");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      style={{ padding: 16, fontFamily: "sans-serif", background: "#f9f9f9" }}
    >
      <h3 style={{ fontWeight: "bold", marginBottom: 8 }}>🤖 チャットボット</h3>

      <button
        onClick={handleReset}
        style={{
          background: "#f43f5e",
          color: "#fff",
          border: "none",
          padding: "8px 12px",
          borderRadius: 6,
          marginBottom: 12,
          cursor: "pointer",
        }}
      >
        🔁 再スタート
      </button>

      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 14, marginBottom: 8 }}>質問を選んでください：</p>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {faq.map((item) => (
            <li key={item.question}>
              <button
                onClick={() => renderFAQ(item, true)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  marginBottom: 6,
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                {item.question}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: 6,
          padding: 12,
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              textAlign: msg.role === "user" ? "right" : "left",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 12,
                background: msg.role === "user" ? "#dcfce7" : "#e5e7eb",
                maxWidth: "80%",
              }}
            >
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>

              {msg.url?.trim() && (
                <div style={{ marginTop: 6 }}>
                  <a
                    href={msg.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 13,
                      color: "#2563eb",
                      textDecoration: "underline",
                    }}
                  >
                    🔗 詳細はこちら
                  </a>
                </div>
              )}

              {msg.options?.map((opt: any, j: number) => (
                <button
                  key={j}
                  onClick={() => handleOptionSelect(opt)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    marginTop: 6,
                    padding: "6px 10px",
                    background: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
