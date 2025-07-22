"use client";

import { useState, useEffect } from "react";

export default function AddSchoolForm() {
  const [schoolId, setSchoolId] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, adminEmail }),
    });

    if (res.ok) {
      setMessage("✅ 学校を追加しました");
      setSchoolId("");
      setAdminEmail("");
      window.location.reload(); // ページを更新
    } else {
      const text = await res.text();
      setMessage(`❌ 追加失敗: ${text}`);
    }
  }

  if (!isMounted) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 p-4 border rounded bg-white shadow"
    >
      <h2 className="text-lg font-semibold mb-2">➕ 学校の追加</h2>
      <div className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="学校ID（例: shibuya-dance）"
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          className="border px-2 py-1 rounded"
          required
        />
        <input
          type="email"
          placeholder="管理者メールアドレス"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          className="border px-2 py-1 rounded"
          required
        />
        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
        >
          追加する
        </button>
        {message && <div className="text-sm mt-2">{message}</div>}
      </div>
    </form>
  );
}
