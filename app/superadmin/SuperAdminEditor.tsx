// app/superadmin/SuperAdminEditor.tsx
"use client";

import { useEffect, useState } from "react";
import { Shield, Trash2, Plus, Copy } from "lucide-react";
import { useSession } from "next-auth/react";

interface Props {
  superAdmins?: string[];
  currentUserEmail?: string;
}

export default function SuperAdminEditor(props: Props) {
  const { data: session } = useSession();
  const currentEmail = props.currentUserEmail || (session?.user?.email ?? "");

  const [admins, setAdmins] = useState<string[]>(props.superAdmins ?? []);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [schoolId, setSchoolId] = useState<string>("");
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  }>();
  const [loading, setLoading] = useState(!props.superAdmins);

  // 初期ロード（propsが無ければAPIから）
  useEffect(() => {
    if (props.superAdmins) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/super-admins", { cache: "no-store" });
        const data = await res.json().catch(() => []);
        if (alive) setAdmins(Array.isArray(data) ? data : []);
      } catch {
        if (alive) setAdmins([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [props.superAdmins]);

  useEffect(() => {
    const extracted = newAdminEmail.split("@")[0];
    setSchoolId(extracted || "");
  }, [newAdminEmail]);

  const toast = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(undefined), 2500);
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;
    try {
      const res = await fetch("/api/super-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", email: newAdminEmail, schoolId }),
      });
      const text = await res.text();
      if (!res.ok) return toast("err", `追加に失敗しました: ${text}`);
      setAdmins((prev) => [...prev, newAdminEmail]);
      setNewAdminEmail("");
      toast("ok", "✅ 追加しました");
    } catch (e: any) {
      toast("err", `追加に失敗しました: ${e?.message || "通信エラー"}`);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    const confirmed = confirm(`「${email}」を Super Admin から削除しますか？`);
    if (!confirmed) return;
    try {
      const res = await fetch("/api/super-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", email }),
      });
      const text = await res.text();
      if (!res.ok) return toast("err", `削除に失敗しました: ${text}`);
      setAdmins((prev) => prev.filter((e) => e !== email));
      toast("ok", "✅ 削除しました");
    } catch (e: any) {
      toast("err", `削除に失敗しました: ${e?.message || "通信エラー"}`);
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Shield className="text-amber-500 dark:text-amber-300" size={18} />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
            Super Admin 管理
          </h2>
        </div>
      </div>

      <div className="card-body space-y-5 sm:space-y-6 p-3 sm:p-6">
        {/* 追加フォーム */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-900/20 p-3 sm:p-4">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                追加するメールアドレス
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="input w-full"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                自動生成された schoolId
              </label>

              {/* ▼ 1カラム（SP）→ 1fr/auto（sm+）。幅に収まらない場合は自然に段落ち */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:items-start">
                <input
                  type="text"
                  value={schoolId}
                  disabled
                  className="input w-full text-gray-600 dark:text-gray-300 min-w-0"
                />
                <button
                  type="button"
                  className="btn-ghost sm:shrink-0"
                  onClick={() =>
                    schoolId && navigator.clipboard.writeText(schoolId)
                  }
                  title="schoolId をコピー"
                  aria-label="schoolId をコピー"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300">
              ※ メールの @ の前を schoolId として登録します
            </p>
            <button
              onClick={handleAddAdmin}
              className="btn-primary inline-flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[40px] disabled:opacity-50"
              disabled={!newAdminEmail}
            >
              <Plus size={16} />
              <span>追加</span>
            </button>
          </div>

          {message && (
            <p
              className={`mt-3 rounded-md px-3 py-2 text-sm border ${
                message.type === "ok"
                  ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200"
                  : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200"
              }`}
            >
              {message.text}
            </p>
          )}
        </div>

        {/* 一覧 */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            Super Admin 一覧
          </h3>

          {loading ? (
            <p className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              読み込み中…
            </p>
          ) : admins.length === 0 ? (
            <p className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              まだ登録がありません
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              {admins.map((email) => (
                <li
                  key={email}
                  // ▼ 1カラム（SP）→ 左:情報 / 右:アクション（sm+）
                  className="px-3 sm:px-4 py-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 sm:gap-4 items-start"
                >
                  {/* 左：情報（長文でも収まるよう min-w-0） */}
                  <div className="min-w-0 flex items-start gap-2">
                    <span
                      className="inline-flex max-w-full items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap truncate"
                      title={email}
                    >
                      {email}
                    </span>
                    {email === currentEmail && (
                      <span className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                        you
                      </span>
                    )}
                  </div>

                  {/* 右：アクション（SPでは下段に落ちて全幅） */}
                  {email !== currentEmail && (
                    <div className="flex sm:justify-end">
                      <button
                        onClick={() => handleRemoveAdmin(email)}
                        className="inline-flex items-center justify-center gap-1 rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 w-full sm:w-auto"
                      >
                        <Trash2 size={14} />
                        削除
                      </button>
                    </div>
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
