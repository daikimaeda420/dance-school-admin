"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Props {
  schoolId: string;
  admins: string[];
}

export default function AdminEditor({ schoolId, admins }: Props) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { data: session } = useSession();
  const myEmail = session?.user?.email;

  async function updateAdmin(targetEmail: string, action: "add" | "remove") {
    if (action === "remove" && targetEmail === myEmail) {
      setMessage("⚠️ 自分自身は削除できません");
      return;
    }

    const confirmed =
      action === "remove"
        ? confirm(`「${targetEmail}」を管理者から外しますか？`)
        : true;

    if (!confirmed) return;

    const res = await fetch("/api/schools", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, email: targetEmail, action }),
    });

    if (res.ok) {
      window.location.reload();
    } else {
      const text = await res.text();
      setMessage(`❌ 更新失敗: ${text}`);
    }
  }

  return (
    <div className="mt-3 text-sm">
      <div className="font-semibold">管理者:</div>
      <ul className="ml-4 list-disc">
        {admins.map((a) => (
          <li key={a} className="flex items-center justify-between">
            <span>{a}</span>
            {a !== myEmail && (
              <button
                onClick={() => updateAdmin(a, "remove")}
                className="text-xs text-red-600 hover:underline"
              >
                削除
              </button>
            )}
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateAdmin(email, "add");
        }}
        className="mt-2 flex gap-2"
      >
        <input
          type="email"
          placeholder="追加する管理者メール"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border px-2 py-1 rounded text-sm"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
        >
          追加
        </button>
      </form>

      {message && <div className="text-xs text-red-500 mt-1">{message}</div>}
    </div>
  );
}
