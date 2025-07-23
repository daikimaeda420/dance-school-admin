"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

export default function SchoolAdminAddPage() {
  const { schoolId } = useParams() as { schoolId: string };

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async () => {
    const res = await fetch(`/api/schools/${schoolId}/admins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });

    const json = await res.json();
    if (res.ok) {
      setStatus("✅ 管理者を追加しました");
      setEmail("");
      setName("");
      setPassword("");
    } else {
      setStatus("❌ 追加失敗：" + json.error);
    }
  };

  return (
    <main className="p-6 max-w-md">
      <h1 className="text-xl font-bold mb-4">{schoolId} の管理者追加</h1>

      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 w-full rounded mb-2"
      />
      <input
        type="text"
        placeholder="名前"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 w-full rounded mb-2"
      />
      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 w-full rounded mb-2"
      />

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        管理者を追加
      </button>

      {status && <p className="mt-2 text-sm">{status}</p>}
    </main>
  );
}
