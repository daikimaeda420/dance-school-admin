// components/UsersEditor.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, Edit3, Plus, Trash2, X } from "lucide-react";

type User = {
  email: string;
  name: string;
  role: "superadmin" | "school-admin" | string;
  schoolId: string;
};

export default function UsersEditor() {
  const { data: session } = useSession();
  const currentEmail = session?.user?.email;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editData, setEditData] = useState<
    Partial<User & { password?: string }>
  >({});
  const [newUser, setNewUser] = useState<Partial<User & { password?: string }>>(
    {}
  );
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  }>();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/users", { cache: "no-store" });
        const data = await res.json();
        if (alive) setUsers(data.users || []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const toast = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(undefined), 2500);
  };

  const startEditing = (user: User) => {
    setEditingEmail(user.email);
    setEditData({ name: user.name, role: user.role, password: "" });
  };
  const cancelEditing = () => {
    setEditingEmail(null);
    setEditData({});
  };

  const saveEdit = async (email: string) => {
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ...editData }),
    });
    if (res.ok) {
      const updatedUsers = users.map((u) =>
        u.email === email ? ({ ...u, ...editData } as User) : u
      );
      setUsers(updatedUsers);
      cancelEditing();
      toast("ok", "✅ 更新しました");
    } else {
      toast("err", "更新に失敗しました");
    }
  };

  const deleteUser = async (email: string) => {
    if (!confirm("本当に削除しますか？")) return;
    const res = await fetch(`/api/users?email=${email}`, { method: "DELETE" });
    if (res.ok) {
      setUsers(users.filter((u) => u.email !== email));
      toast("ok", "✅ 削除しました");
    } else {
      const err = await res.json().catch(() => ({}));
      toast("err", "削除に失敗しました: " + (err.error || ""));
    }
  };

  const addUser = async () => {
    const { email, name, role, password } = newUser;
    if (!email || !name || !role || !password) {
      toast("err", "全ての項目を入力してください");
      return;
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      const refreshed = await fetch("/api/users").then((r) => r.json());
      setUsers(refreshed.users || []);
      setNewUser({});
      toast("ok", "✅ 追加しました");
    } else {
      const err = await res.json().catch(() => ({}));
      toast("err", "追加に失敗しました: " + (err.error || ""));
    }
  };

  const roleBadge = (r: string) => (
    <span
      className={
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] " +
        (r === "superadmin"
          ? "border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-200"
          : "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-200")
      }
    >
      {r}
    </span>
  );

  const total = users.length;
  const superCount = useMemo(
    () => users.filter((u) => u.role === "superadmin").length,
    [users]
  );

  return (
    <div className="space-y-4">
      {/* トップ情報 */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          ユーザー管理
        </h2>
        <div className="text-xs text-gray-600 dark:text-gray-300">
          総数 <span className="font-semibold">{total}</span>・ SuperAdmin{" "}
          <span className="font-semibold">{superCount}</span>
        </div>
      </div>

      {message && (
        <div
          className={
            "rounded-md border px-3 py-2 text-sm " +
            (message.type === "ok"
              ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200"
              : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200")
          }
        >
          {message.text}
        </div>
      )}

      {/* テーブル */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm w-max">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">名前</th>
              <th className="px-3 py-2 text-left">ロール</th>
              <th className="px-3 py-2 text-left">School ID</th>
              <th className="px-3 py-2 text-left">パスワード</th>
              <th className="px-3 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-gray-500 dark:text-gray-400"
                >
                  読み込み中…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-gray-500 dark:text-gray-400"
                >
                  まだユーザーがいません
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isEditing = editingEmail === u.email;
                return (
                  <tr key={u.email} className="align-top">
                    <td className="px-3 py-2">{u.email}</td>

                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          value={editData.name || ""}
                          onChange={(e) =>
                            setEditData((d) => ({ ...d, name: e.target.value }))
                          }
                          className="input w-full"
                        />
                      ) : (
                        u.name
                      )}
                    </td>

                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select
                          value={editData.role || ""}
                          onChange={(e) =>
                            setEditData((d) => ({ ...d, role: e.target.value }))
                          }
                          className="input w-full"
                        >
                          <option value="superadmin">superadmin</option>
                          <option value="school-admin">school-admin</option>
                        </select>
                      ) : (
                        roleBadge(u.role)
                      )}
                    </td>

                    <td className="px-3 py-2">{u.schoolId}</td>

                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          type="password"
                          value={editData.password || ""}
                          placeholder="変更する場合のみ入力"
                          onChange={(e) =>
                            setEditData((d) => ({
                              ...d,
                              password: e.target.value,
                            }))
                          }
                          className="input w-full"
                        />
                      ) : (
                        "••••••••"
                      )}
                    </td>

                    <td className="px-3 py-2">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveEdit(u.email)}
                            className="btn-primary inline-flex items-center gap-1"
                          >
                            <Check size={16} /> 保存
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="btn-ghost inline-flex items-center gap-1"
                          >
                            <X size={16} /> キャンセル
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditing(u)}
                            className="btn-ghost inline-flex items-center gap-1"
                          >
                            <Edit3 size={16} /> 編集
                          </button>
                          {u.email !== currentEmail && (
                            <button
                              onClick={() => deleteUser(u.email)}
                              className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                            >
                              <Trash2 size={16} /> 削除
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}

            {/* 新規追加行 */}
            <tr className="bg-gray-50 dark:bg-gray-800/40">
              <td className="px-3 py-2">
                <input
                  type="email"
                  value={newUser.email || ""}
                  onChange={(e) =>
                    setNewUser((u) => ({ ...u, email: e.target.value }))
                  }
                  className="input w-full"
                  placeholder="email@example.com"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  value={newUser.name || ""}
                  onChange={(e) =>
                    setNewUser((u) => ({ ...u, name: e.target.value }))
                  }
                  className="input w-full"
                  placeholder="氏名"
                />
              </td>
              <td className="px-3 py-2">
                <select
                  value={newUser.role || ""}
                  onChange={(e) =>
                    setNewUser((u) => ({ ...u, role: e.target.value }))
                  }
                  className="input w-full"
                >
                  <option value="">ロール選択</option>
                  <option value="superadmin">superadmin</option>
                  <option value="school-admin">school-admin</option>
                </select>
              </td>
              <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">
                自動生成
              </td>
              <td className="px-3 py-2">
                <input
                  type="password"
                  value={newUser.password || ""}
                  onChange={(e) =>
                    setNewUser((u) => ({ ...u, password: e.target.value }))
                  }
                  className="input w-full"
                  placeholder="初期パスワード"
                />
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={addUser}
                  className="btn-primary inline-flex items-center gap-1"
                >
                  <Plus size={16} /> 追加
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
