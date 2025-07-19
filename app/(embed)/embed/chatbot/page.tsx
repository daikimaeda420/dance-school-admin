"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type FAQItem = { question: string; answer: string };

export default function ChatbotEmbedPage() {
  const params = useSearchParams();
  const schoolId = params.get("school") ?? "";
  const [faqList, setFaqList] = useState<FAQItem[]>([]);
  const [selected, setSelected] = useState<FAQItem | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    fetch(`/api/faq?school=${schoolId}`)
      .then((res) => res.json())
      .then((data) => setFaqList(data));
  }, [schoolId]);

  const handleClick = async (item: FAQItem) => {
    setSelected(item);
    await fetch("/api/faq-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school: schoolId,
        question: item.question,
        answer: item.answer,
        timestamp: new Date().toISOString(),
      }),
    });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📘 ご質問はこちら！</h2>

      <div style={styles.list}>
        {faqList.map((item, idx) => (
          <button
            key={idx}
            style={styles.button}
            onClick={() => handleClick(item)}
          >
            {item.question}
          </button>
        ))}
      </div>

      {selected && (
        <div style={styles.answer}>
          <strong>回答：</strong>
          <p>{selected.answer}</p>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    fontFamily: "sans-serif",
    background: "white",
    padding: "16px",
    height: "100%",
    boxSizing: "border-box",
  },
  title: {
    fontSize: "1.1rem",
    marginBottom: "12px",
    fontWeight: "bold",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "16px",
  },
  button: {
    padding: "10px 12px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    background: "#f9f9f9",
    textAlign: "left",
    cursor: "pointer",
  },
  answer: {
    padding: "12px",
    border: "1px solid #ccc",
    background: "#f1f9ff",
    borderRadius: "6px",
  },
};
