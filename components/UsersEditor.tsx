"use client";

import { useEffect, useState } from "react";

export default function UsersEditor() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("school-admin");
  const [schoolId, setSchoolId] = useState("");
  const [status, setStatus] = useState("");

  const schoolIdOptions = ["dansul", "tetsumeiii", "test-school"];

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users);
  };

  const addUser = async () => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password, role, schoolId }),
    });
    const json = await res.json();
    if (res.ok) {
      setStatus("✅ 追加しました");
      setEmail("");
      setName("");
      setPassword("");
      fetchUsers();
    } else {
      setStatus("❌ エラー：" + json.error);
    }
  };

  const deleteUser = async (email: string) => {
    await fetch(`/api/users?email=${email}`, { method: "DELETE" });
    fetchUsers();
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">👥 管理者一覧</h2>

      <table className="w-full border mb-6">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Email</th>
            <th className="p-2">名前</th>
            <th className="p-2">ロール</th>
            <th className="p-2">School ID</th>
            <th className="p-2">削除</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.email} className="border-t">
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.name}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2">{u.schoolId || "-"}</td>
              <td className="p-2">
                <button
                  onClick={() => deleteUser(u.email)}
                  className="text-red-600 hover:underline"
                >
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-lg font-semibold mb-2">➕ 管理者を追加</h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <input
          placeholder="メール"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2"
        />
        <input
          placeholder="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2"
        />
        <input
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2"
          type="password"
        />
        <select
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          className="border p-2"
        >
          <option value="">School ID（任意）</option>
          {schoolIdOptions.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border p-2"
        >
          <option value="school-admin">school-admin</option>
          <option value="superadmin">superadmin</option>
        </select>
      </div>

      <button
        onClick={addUser}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        追加
      </button>

      {status && <p className="mt-2 text-sm">{status}</p>}
    </div>
  );
}
