// app/superadmin/SuperAdminEditor.tsx
"use client";

import { useState, useEffect } from "react";

interface Props {
  superAdmins: string[];
  currentUserEmail: string;
}

export default function SuperAdminEditor({
  superAdmins,
  currentUserEmail,
}: Props) {
  const [admins, setAdmins] = useState<string[]>(superAdmins);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [schoolId, setSchoolId] = useState<string>("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const extracted = newAdminEmail.split("@")[0];
    setSchoolId(extracted || "");
  }, [newAdminEmail]);

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;

    const res = await fetch("/api/super-admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        email: newAdminEmail,
        schoolId,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      alert(`追加に失敗しました: ${text}`);
      return;
    }

    setAdmins((prev) => [...prev, newAdminEmail]);
    setNewAdminEmail("");
    setMessage("✅ 追加しました");
  };

  const handleRemoveAdmin = async (email: string) => {
    const confirmed = confirm(`「${email}」を Super Admin から削除しますか？`);
    if (!confirmed) return;

    const res = await fetch("/api/super-admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", email }),
    });

    const text = await res.text();
    if (!res.ok) {
      alert(`削除に失敗しました: ${text}`);
      return;
    }

    setAdmins((prev) => prev.filter((e) => e !== email));
    setMessage("✅ 削除しました");
  };

  return (
    <div className="bg-white shadow p-4 rounded space-y-4">
      <h2 className="text-lg font-bold">Super Admin 一覧</h2>
      <ul className="list-disc pl-5 space-y-1">
        {admins.map((email) => (
          <li key={email} className="flex justify-between items-center">
            <span>{email}</span>
            {email !== currentUserEmail && (
              <button
                onClick={() => handleRemoveAdmin(email)}
                className="text-sm text-red-600 hover:underline"
              >
                削除
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <input
          type="email"
          placeholder="追加するメールアドレス"
          value={newAdminEmail}
          onChange={(e) => setNewAdminEmail(e.target.value)}
          className="border px-2 py-1 rounded w-full mb-2"
        />

        {/* 自動生成された schoolId を表示（編集不可） */}
        <input
          type="text"
          value={schoolId}
          disabled
          className="border px-2 py-1 rounded w-full mb-2 bg-gray-100 text-gray-600"
        />

        <button
          onClick={handleAddAdmin}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
        >
          追加
        </button>
        {message && <p className="text-sm mt-2 text-green-600">{message}</p>}
      </div>
    </div>
  );
}
