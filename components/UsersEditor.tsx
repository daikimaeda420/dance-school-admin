"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react"; // ✅ ① セッション取得のため追加

type User = {
  email: string;
  name: string;
  role: string;
  schoolId: string;
};

export default function UsersEditor() {
  const { data: session } = useSession(); // ✅ ② 現在のログインユーザー取得
  const currentEmail = session?.user?.email;

  const [users, setUsers] = useState<User[]>([]);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editData, setEditData] = useState<
    Partial<User & { password?: string }>
  >({});
  const [newUser, setNewUser] = useState<Partial<User & { password?: string }>>(
    {}
  );

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users));
  }, []);

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
        u.email === email ? { ...u, ...editData } : u
      );
      setUsers(updatedUsers as User[]);
      cancelEditing();
    } else {
      alert("更新に失敗しました");
    }
  };

  const deleteUser = async (email: string) => {
    if (!confirm("本当に削除しますか？")) return;
    const res = await fetch(`/api/users?email=${email}`, { method: "DELETE" });
    if (res.ok) {
      setUsers(users.filter((u) => u.email !== email));
    } else {
      const err = await res.json();
      alert("削除に失敗しました: " + (err.error || ""));
    }
  };

  const addUser = async () => {
    const { email, name, role, password } = newUser;
    if (!email || !name || !role || !password) {
      alert("全ての項目を入力してください");
      return;
    }

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });

    if (res.ok) {
      const refreshed = await fetch("/api/users").then((r) => r.json());
      setUsers(refreshed.users);
      setNewUser({});
    } else {
      const err = await res.json();
      alert("追加に失敗しました: " + (err.error || ""));
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">ユーザー管理</h2>
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Email</th>
            <th className="border px-2 py-1">名前</th>
            <th className="border px-2 py-1">ロール</th>
            <th className="border px-2 py-1">School ID</th>
            <th className="border px-2 py-1">パスワード</th>
            <th className="border px-2 py-1">操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.email}>
              <td className="border px-2">{u.email}</td>
              <td className="border px-2">
                {editingEmail === u.email ? (
                  <input
                    value={editData.name || ""}
                    onChange={(e) =>
                      setEditData((d) => ({ ...d, name: e.target.value }))
                    }
                    className="border p-1 w-full"
                  />
                ) : (
                  u.name
                )}
              </td>
              <td className="border px-2">
                {editingEmail === u.email ? (
                  <select
                    value={editData.role || ""}
                    onChange={(e) =>
                      setEditData((d) => ({ ...d, role: e.target.value }))
                    }
                    className="border p-1 w-full"
                  >
                    <option value="superadmin">superadmin</option>
                    <option value="school-admin">school-admin</option>
                  </select>
                ) : (
                  u.role
                )}
              </td>
              <td className="border px-2">{u.schoolId}</td>
              <td className="border px-2">
                {editingEmail === u.email ? (
                  <input
                    type="password"
                    value={editData.password || ""}
                    placeholder="変更する場合のみ入力"
                    onChange={(e) =>
                      setEditData((d) => ({ ...d, password: e.target.value }))
                    }
                    className="border p-1 w-full"
                  />
                ) : (
                  "••••••••"
                )}
              </td>
              <td className="border px-2">
                {editingEmail === u.email ? (
                  <>
                    <button onClick={() => saveEdit(u.email)} className="mr-2">
                      保存
                    </button>
                    <button onClick={cancelEditing}>キャンセル</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEditing(u)} className="mr-2">
                      編集
                    </button>
                    {u.email !== currentEmail && ( // ✅ ③ 自分の削除を制限
                      <button onClick={() => deleteUser(u.email)}>削除</button>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}

          {/* 新規追加行 */}
          <tr className="bg-gray-50">
            <td className="border px-2">
              <input
                type="email"
                value={newUser.email || ""}
                onChange={(e) =>
                  setNewUser((u) => ({ ...u, email: e.target.value }))
                }
                className="border p-1 w-full"
              />
            </td>
            <td className="border px-2">
              <input
                value={newUser.name || ""}
                onChange={(e) =>
                  setNewUser((u) => ({ ...u, name: e.target.value }))
                }
                className="border p-1 w-full"
              />
            </td>
            <td className="border px-2">
              <select
                value={newUser.role || ""}
                onChange={(e) =>
                  setNewUser((u) => ({ ...u, role: e.target.value }))
                }
                className="border p-1 w-full"
              >
                <option value="">選択</option>
                <option value="superadmin">superadmin</option>
                <option value="school-admin">school-admin</option>
              </select>
            </td>
            <td className="border px-2 text-center text-gray-400">自動生成</td>
            <td className="border px-2">
              <input
                type="password"
                value={newUser.password || ""}
                onChange={(e) =>
                  setNewUser((u) => ({ ...u, password: e.target.value }))
                }
                className="border p-1 w-full"
              />
            </td>
            <td className="border px-2">
              <button onClick={addUser}>追加</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
