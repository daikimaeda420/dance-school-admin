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

/** API のベース URL（必ず rizbo の API を叩く用） */
function getApiBase() {
  // 例: https://rizbo.dansul.jp
  const envBase = process.env.NEXT_PUBLIC_RIZBO_API_ORIGIN;
  if (envBase) return envBase.replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "";
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
    const sessionId = getSessionId();
    const base = getApiBase();
    if (!base) return;

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

  // ==== FAQ 取得（/api/faq?school=... を rizbo の API に向ける） ====
  useEffect(() => {
    if (!schoolId) return;

    let aborted = false;
    const run = async () => {
      const base = getApiBase();
      if (!base) {
        console.warn("API base URL が解決できませんでした");
        return;
      }

      try {
        // 1) 現行形式: /api/faq?school=ID
        const r1 = await fetch(
          `${base}/api/faq?school=${encodeURIComponent(schoolId)}`,
          { cache: "no-store", mode: "cors" }
        );
        if (r1.ok) {
          const d1 = await r1.json();
          if (!aborted) setFaq(normalizeFaq(d1));
          return;
        }

        // 2) フォールバック: /api/faq/{school}
        const r2 = await fetch(
          `${base}/api/faq/${encodeURIComponent(schoolId)}`,
          { cache: "no-store", mode: "cors" }
        );
        const d2 = r2.ok ? await r2.json() : null;
        if (!aborted) setFaq(normalizeFaq(d2));
      } catch (e) {
        console.error("FAQ取得失敗:", e);
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
    if (!faq.length) return;

    const greet = bot("ご不明な点はありますか？ お気軽にお問合せください。");
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
      {/* 以下の JSX / CSS は元のまま */}
      {/* ...（中略：JSX と style 部分はそのままコピペでOK）... */}
      {/* ここは元コードをそのまま使ってください */}
      {/* 省略しているだけで変更はありません */}
    </div>
  );
}
