"use client";

import { useEffect, useState } from "react";

export default function Chatbot({ schoolId }: { schoolId: string }) {
  const [faq, setFaq] = useState<{ question: string; answer: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/faq?school=${schoolId}`)
      .then((res) => res.json())
      .then(setFaq);
  }, [schoolId]);

  // ✅ 回答付きログ送信処理
  const logSelection = async (question: string, answer: string) => {
    try {
      await fetch("/api/faq-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          question,
          answer,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("ログ送信に失敗しました", err);
    }
  };

  const handleSelect = (index: number) => {
    setSelected(index);
    const { question, answer } = faq[index];
    logSelection(question, answer);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 1000,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          backgroundColor: "#333",
          color: "white",
          padding: "10px 15px",
          borderRadius: "50px",
          border: "none",
        }}
      >
        💬
      </button>

      {open && (
        <div
          style={{
            backgroundColor: "white",
            width: "300px",
            maxHeight: "400px",
            overflowY: "auto",
            padding: "16px",
            marginTop: "8px",
            border: "1px solid #ccc",
            borderRadius: "10px",
            boxShadow: "0 0 10px rgba(0,0,0,0.2)",
          }}
        >
          {selected === null ? (
            <>
              <h3 style={{ marginBottom: "10px" }}>質問を選んでください</h3>
              {faq.map((f, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    background: "#f0f0f0",
                    padding: "8px",
                    borderRadius: "6px",
                    textAlign: "left",
                    width: "100%",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {f.question}
                </button>
              ))}
            </>
          ) : (
            <>
              <p>
                <strong>Q:</strong> {faq[selected].question}
              </p>
              <p>
                <strong>A:</strong> {faq[selected].answer}
              </p>
              <button
                onClick={() => setSelected(null)}
                style={{ marginTop: "12px", fontSize: "0.9rem" }}
              >
                ← 戻る
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
