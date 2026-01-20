"use client";

import { useEffect, useMemo, useState } from "react";

type Field = {
  id?: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string | null;
  isActive?: boolean;
  optionsJson?: any;
};

type FormData = {
  id: string;
  isActive: boolean;
  title?: string | null;
  description?: string | null;
  submitType: string;
  submitUrl?: string | null;
  thanksType: string;
  thanksText?: string | null;
  thanksUrl?: string | null;
  fields: Field[];
};

type EmailSetting = {
  id: string;
  schoolId: string;
  isActive: boolean;

  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;

  adminTo: string; // カンマ区切り
  adminCc?: string | null;
  adminBcc?: string | null;

  adminSubjectTemplate: string;
  adminBodyTemplate?: string | null;

  userAutoReplyEnabled: boolean;
  userSubjectTemplate: string;
  userBodyTemplate?: string | null;
};

const FIELD_TYPES = [
  "TEXT",
  "EMAIL",
  "TEL",
  "TEXTAREA",
  "SELECT",
  "CHECKBOX",
  "HIDDEN",
] as const;

const INPUT_BASE =
  "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm " +
  "dark:border-gray-600 dark:bg-gray-800";

const TEXTAREA_BASE =
  "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm " +
  "dark:border-gray-600 dark:bg-gray-800";

function ensureJsonContentType(res: Response, bodyText: string) {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    throw new Error(
      `APIがJSONを返していません (status=${res.status}). ${bodyText.slice(0, 120)}`,
    );
  }
}

export default function FormAdminClient({ schoolId }: { schoolId: string }) {
  const [form, setForm] = useState<FormData | null>(null);
  const [emailSetting, setEmailSetting] = useState<EmailSetting | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  // 画面上にまとめて出す用（フォームのエラー優先→メールのエラー）
  const topError = useMemo(() => err ?? emailErr, [err, emailErr]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      setEmailErr(null);

      try {
        // ✅ フォーム
        const res = await fetch(
          `/api/admin/diagnosis/form?schoolId=${encodeURIComponent(schoolId)}`,
          { cache: "no-store" },
        );

        const text = await res.text();
        ensureJsonContentType(res, text);
        const data = JSON.parse(text);

        if (!res.ok) throw new Error(data?.message ?? "フォームAPI error");
        if (!cancelled) setForm(data);

        // ✅ メール設定（別API）
        // まだAPIが無い場合は 404 になるので、エラー表示だけしてフォーム編集は生かす
        try {
          const res2 = await fetch(
            `/api/admin/diagnosis/form-email?schoolId=${encodeURIComponent(
              schoolId,
            )}`,
            { cache: "no-store" },
          );

          const text2 = await res2.text();
          ensureJsonContentType(res2, text2);
          const data2 = JSON.parse(text2);

          if (!res2.ok)
            throw new Error(data2?.message ?? "メール設定API error");
          if (!cancelled) setEmailSetting(data2);
        } catch (e: any) {
          if (!cancelled) {
            setEmailSetting(null);
            setEmailErr(
              e?.message ??
                "メール設定の読み込みに失敗しました（API未実装の可能性）",
            );
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setForm(null);
          setErr(e?.message ?? "読み込みに失敗しました");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  if (loading)
    return (
      <div className="text-gray-600 dark:text-gray-400">読み込み中...</div>
    );

  if (!form) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
        {err ?? "フォームが見つかりません"}
      </div>
    );
  }

  function updateField(index: number, patch: Partial<Field>) {
    const next = [...form.fields];
    next[index] = { ...next[index], ...patch };
    setForm({ ...form, fields: next });
  }

  function moveField(index: number, dir: -1 | 1) {
    const next = [...form.fields];
    const target = next[index];
    next.splice(index, 1);
    next.splice(index + dir, 0, target);
    setForm({ ...form, fields: next });
  }

  function addField() {
    setForm({
      ...form,
      fields: [
        ...form.fields,
        { label: "新しい項目", type: "TEXT", required: false, isActive: true },
      ],
    });
  }

  function removeField(index: number) {
    if (!confirm("この項目を削除しますか？")) return;
    const next = [...form.fields];
    next.splice(index, 1);
    setForm({ ...form, fields: next });
  }

  async function saveAll() {
    setSaving(true);
    setErr(null);
    setEmailErr(null);

    try {
      // ✅ まずフォーム保存
      {
        const res = await fetch("/api/admin/diagnosis/form", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const text = await res.text();
        ensureJsonContentType(res, text);
        const data = JSON.parse(text);

        if (!res.ok)
          throw new Error(data?.message ?? "フォームの保存に失敗しました");
      }

      // ✅ メール設定がロードされている場合のみ保存
      // （API未実装/未ロードの場合は、フォーム保存だけ成功させる）
      if (emailSetting) {
        const res2 = await fetch("/api/admin/diagnosis/form-email", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailSetting),
        });

        const text2 = await res2.text();
        ensureJsonContentType(res2, text2);
        const data2 = JSON.parse(text2);

        if (!res2.ok)
          throw new Error(data2?.message ?? "メール設定の保存に失敗しました");
      }

      alert("保存しました");
    } catch (e: any) {
      const msg = e?.message ?? "保存に失敗しました";
      // フォーム保存失敗かメール設定保存失敗か判別が難しいので、とりあえず上部に出す
      setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {topError && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
          {topError}
        </div>
      )}

      {/* ========== フォーム基本 ========== */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-semibold">フォーム設定</div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            フォームを表示する
          </label>
        </div>

        <div>
          <label className="block text-sm mb-1">タイトル</label>
          <input
            className={INPUT_BASE}
            value={form.title ?? ""}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">説明文</label>
          <textarea
            className={TEXTAREA_BASE}
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </section>

      {/* ========== フォーム項目 ========== */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">フォーム項目</h3>
          <button
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
            onClick={addField}
            type="button"
          >
            ＋ 項目追加
          </button>
        </div>

        {form.fields.map((f, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-2 items-center rounded border border-gray-200 bg-gray-50 p-3
                       dark:border-gray-700 dark:bg-gray-800"
          >
            <input
              className="col-span-3 rounded border border-gray-300 bg-white px-2 py-1 text-sm
                         dark:border-gray-600 dark:bg-gray-900"
              value={f.label}
              onChange={(e) => updateField(i, { label: e.target.value })}
            />

            <select
              className="col-span-2 rounded border border-gray-300 bg-white px-2 py-1 text-sm
                         dark:border-gray-600 dark:bg-gray-900"
              value={f.type}
              onChange={(e) => updateField(i, { type: e.target.value })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <input
              className="col-span-3 rounded border border-gray-300 bg-white px-2 py-1 text-sm
                         dark:border-gray-600 dark:bg-gray-900"
              placeholder="placeholder"
              value={f.placeholder ?? ""}
              onChange={(e) => updateField(i, { placeholder: e.target.value })}
            />

            <label className="col-span-2 flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={!!f.required}
                onChange={(e) => updateField(i, { required: e.target.checked })}
              />
              必須
            </label>

            <div className="col-span-2 flex justify-end gap-1 text-sm">
              <button
                disabled={i === 0}
                onClick={() => moveField(i, -1)}
                type="button"
                className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
              >
                ↑
              </button>
              <button
                disabled={i === form.fields.length - 1}
                onClick={() => moveField(i, 1)}
                type="button"
                className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
              >
                ↓
              </button>
              <button
                className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600 dark:border-gray-600 dark:text-red-400"
                onClick={() => removeField(i)}
                type="button"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* ========== メール設定（統合） ========== */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">メール設定</h3>
          {!emailSetting && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              （メール設定APIが未実装/未取得の可能性があります）
            </div>
          )}
        </div>

        {emailSetting ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={emailSetting.isActive}
                onChange={(e) =>
                  setEmailSetting({
                    ...emailSetting,
                    isActive: e.target.checked,
                  })
                }
              />
              メール機能を有効にする
            </label>

            {/* 送信元 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1">
                  送信元名（From name）
                </label>
                <input
                  className={INPUT_BASE}
                  value={emailSetting.fromName ?? ""}
                  onChange={(e) =>
                    setEmailSetting({
                      ...emailSetting,
                      fromName: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  送信元メール（From email）
                </label>
                <input
                  className={INPUT_BASE}
                  placeholder="no-reply@yourdomain.com"
                  value={emailSetting.fromEmail ?? ""}
                  onChange={(e) =>
                    setEmailSetting({
                      ...emailSetting,
                      fromEmail: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">返信先（Reply-To）</label>
                <input
                  className={INPUT_BASE}
                  placeholder="info@yourdomain.com"
                  value={emailSetting.replyTo ?? ""}
                  onChange={(e) =>
                    setEmailSetting({
                      ...emailSetting,
                      replyTo: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* 管理者通知 */}
            <div className="space-y-2">
              <div className="text-sm font-semibold">
                管理者通知（リード通知）
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm mb-1">
                    To（必須・カンマ区切り）
                  </label>
                  <input
                    className={INPUT_BASE}
                    placeholder="a@example.com,b@example.com"
                    value={emailSetting.adminTo ?? ""}
                    onChange={(e) =>
                      setEmailSetting({
                        ...emailSetting,
                        adminTo: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">
                    CC（カンマ区切り）
                  </label>
                  <input
                    className={INPUT_BASE}
                    value={emailSetting.adminCc ?? ""}
                    onChange={(e) =>
                      setEmailSetting({
                        ...emailSetting,
                        adminCc: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">
                    BCC（カンマ区切り）
                  </label>
                  <input
                    className={INPUT_BASE}
                    value={emailSetting.adminBcc ?? ""}
                    onChange={(e) =>
                      setEmailSetting({
                        ...emailSetting,
                        adminBcc: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">
                  管理者通知 件名テンプレ
                </label>
                <input
                  className={INPUT_BASE}
                  value={emailSetting.adminSubjectTemplate ?? ""}
                  onChange={(e) =>
                    setEmailSetting({
                      ...emailSetting,
                      adminSubjectTemplate: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  管理者通知 本文テンプレ
                </label>
                <textarea
                  className={TEXTAREA_BASE}
                  rows={6}
                  value={emailSetting.adminBodyTemplate ?? ""}
                  onChange={(e) =>
                    setEmailSetting({
                      ...emailSetting,
                      adminBodyTemplate: e.target.value,
                    })
                  }
                />
                <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  例：{"{{fieldsText}}"} / {"{{submittedAt}}"} /{" "}
                  {"{{schoolId}}"} など（差し込みは送信API側で実装）
                </div>
              </div>
            </div>

            {/* 自動返信 */}
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">ユーザー自動返信</div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={emailSetting.userAutoReplyEnabled}
                    onChange={(e) =>
                      setEmailSetting({
                        ...emailSetting,
                        userAutoReplyEnabled: e.target.checked,
                      })
                    }
                  />
                  有効
                </label>
              </div>

              <div>
                <label className="block text-sm mb-1">
                  自動返信 件名テンプレ
                </label>
                <input
                  className={INPUT_BASE}
                  value={emailSetting.userSubjectTemplate ?? ""}
                  onChange={(e) =>
                    setEmailSetting({
                      ...emailSetting,
                      userSubjectTemplate: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  自動返信 本文テンプレ
                </label>
                <textarea
                  className={TEXTAREA_BASE}
                  rows={6}
                  value={emailSetting.userBodyTemplate ?? ""}
                  onChange={(e) =>
                    setEmailSetting({
                      ...emailSetting,
                      userBodyTemplate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            メール設定が取得できませんでした。
            <br />
            <span className="text-xs">
              `/api/admin/diagnosis/form-email`（GET/PUT）を実装すると編集できるようになります。
            </span>
          </div>
        )}
      </section>

      {/* ========== 保存ボタン ========== */}
      <div className="text-right">
        <button
          onClick={saveAll}
          disabled={saving}
          className="rounded bg-green-600 px-6 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          type="button"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  );
}
