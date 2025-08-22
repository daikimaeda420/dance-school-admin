// app/superadmin/SuperAdminEditor.tsx
"use client";

import { useState, useEffect } from "react";
import { Shield, Trash2, Plus } from "lucide-react";

interface Props {
  superAdmins: string[];
  currentUserEmail: string;
}

export default function SuperAdminEditor({
  superAdmins,
  currentUserEmail,
}: Props) {
  const initial = Array.isArray(superAdmins) ? superAdmins : [];
  const [admins, setAdmins] = useState<string[]>(initial);
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
    setTimeout(() => setMessage(""), 2000);
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
    setTimeout(() => setMessage(""), 2000);
  };

  return (
    <section className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Shield className="text-amber-500" size={18} />
          <h2 className="font-semibold text-gray-900">Super Admin 管理</h2>
        </div>
      </div>

      <div className="card-body space-y-6">
        {/* 追加フォーム */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-gray-700">
                追加するメールアドレス
              </label>
              <input
                type="email"
                placeholder="admin@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-700">
                自動生成された schoolId
              </label>
              <input
                type="text"
                value={schoolId}
                disabled
                className="input bg-gray-50 text-gray-600"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-600">
              ※ メールの @ の前を schoolId として登録します
            </p>
            <button
              onClick={handleAddAdmin}
              className="btn-primary inline-flex items-center"
            >
              <Plus size={16} /> 追加
            </button>
          </div>

          {message && (
            <p className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </p>
          )}
        </div>

        {/* 一覧 */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            Super Admin 一覧
          </h3>
          {admins.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
              まだ登録がありません
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {admins.map((email) => (
                <li
                  key={email}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {email}
                    </span>
                    {email === currentUserEmail && (
                      <span className="text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        you
                      </span>
                    )}
                  </div>

                  {email !== currentUserEmail && (
                    <button
                      onClick={() => handleRemoveAdmin(email)}
                      className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                    >
                      <Trash2 size={14} />
                      削除
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
