// app/admin/diagnosis/form/FormAdminClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AdminPageHeader from "../_components/AdminPageHeader";
import { adminCard } from "../_components/adminStyles";

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
  courseSelectType: string;
  fields: Field[];
};

type EmailSetting = {
  id: string;
  schoolId: string;
  isActive: boolean;

  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;

  adminTo: string;
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
  "DATE", // ✅ 追加
  "HIDDEN",
] as const;

// フォーム側のロジックと合わせる
const isClassField = (label: string) =>
  ["体験クラス", "体験コース", "クラス", "コース"].some((k) => label.includes(k));

const isDateField = (label: string) =>
  ["体験日", "日程", "日時", "体験レッスン日時"].some((k) => label.includes(k));

const isNameField = (label: string) =>
  ["名前", "氏名", "お名前"].some((k) => label.includes(k));

const isEmailField = (label: string) =>
  ["メール", "email", "アドレス"].some((k) => label.toLowerCase().includes(k));

const isPhoneField = (label: string) =>
  ["電話", "tel", "電話番号"].some((k) => label.toLowerCase().includes(k));

const isQuestionField = (label: string) =>
  ["質問", "備考", "ご要望", "その他"].some((k) => label.includes(k));

function ensureRequiredFields(fData: FormData): FormData {
  if (!fData.fields) fData.fields = [];
  
  // 1. お名前の保証
  const hasNameField = fData.fields.some((f) => !!f.label && isNameField(f.label));
  if (!hasNameField) {
    fData.fields.push({
      label: "お名前",
      type: "TEXT",
      required: true,
      isActive: true,
      placeholder: "例）山田 太郎",
    });
  }

  // 2. メールアドレスの保証
  const hasEmailField = fData.fields.some((f) => !!f.label && isEmailField(f.label));
  if (!hasEmailField) {
    fData.fields.push({
      label: "メールアドレス",
      type: "EMAIL",
      required: true,
      isActive: true,
      placeholder: "例）taro@example.com",
    });
  }

  // 3. 電話番号の保証
  const hasPhoneField = fData.fields.some((f) => !!f.label && isPhoneField(f.label));
  if (!hasPhoneField) {
    fData.fields.push({
      label: "電話番号",
      type: "TEL",
      required: true, // 今回のご要望で必須に設定
      isActive: true,
      placeholder: "例）090-1234-5678",
    });
  }

  // 4. 体験コースの保証
  const hasClassField = fData.fields.some((f) => !!f.label && isClassField(f.label));
  if (!hasClassField) {
    fData.fields.push({
      label: "体験コース",
      type: "SELECT",
      required: true,
      isActive: true,
    });
  }

  // 5. 体験レッスン日時の保証
  const hasDateField = fData.fields.some((f) => !!f.label && isDateField(f.label));
  if (!hasDateField) {
    fData.fields.push({
      label: "体験レッスン日時",
      type: "DATE",
      required: true,
      isActive: true,
    });
  }

  // 6. 質問などの保証
  const hasQuestionField = fData.fields.some((f) => !!f.label && isQuestionField(f.label));
  if (!hasQuestionField) {
    fData.fields.push({
      label: "質問など",
      type: "TEXTAREA",
      required: false,
      isActive: true,
      placeholder: "気になる点やご要望などがあればご記入ください",
    });
  }

  return fData;
}

// ✅ placeholder を必ず見えるように（light/dark 両対応）
const INPUT_BASE =
  "w-full rounded border px-3 py-2 text-sm outline-none " +
  "border-gray-300 bg-white text-gray-900 " +
  "placeholder:text-gray-400 placeholder:opacity-100 " +
  "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 " +
  "dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 " +
  "dark:placeholder:text-gray-500";

const TEXTAREA_BASE =
  "w-full min-h-[96px] rounded border px-3 py-2 text-sm outline-none " +
  "border-gray-300 bg-white text-gray-900 " +
  "placeholder:text-gray-400 placeholder:opacity-100 " +
  "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 " +
  "dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 " +
  "dark:placeholder:text-gray-500";

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

  const [originalForm, setOriginalForm] = useState<FormData | null>(null);
  const [originalEmail, setOriginalEmail] = useState<EmailSetting | null>(null);

  // 画面上にまとめて出す用（フォームのエラー優先→メールのエラー）
  const topError = useMemo(() => err ?? emailErr, [err, emailErr]);

  const isDirty = useMemo(() => {
    if (!form || !originalForm) return false;
    return JSON.stringify(form) !== JSON.stringify(originalForm) ||
           JSON.stringify(emailSetting) !== JSON.stringify(originalEmail);
  }, [form, originalForm, emailSetting, originalEmail]);

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
        if (!cancelled) {
          const fd = ensureRequiredFields(data);
          setForm(fd);
          setOriginalForm(JSON.parse(JSON.stringify(fd)));
        }

        // ✅ メール設定（別API）
        // API未実装/テーブル未作成などで失敗しても、フォーム編集は生かす
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
          if (!cancelled) {
            setEmailSetting(data2);
            setOriginalEmail(JSON.parse(JSON.stringify(data2)));
          }
        } catch (e: any) {
          if (!cancelled) {
            setEmailSetting(null);
            setEmailErr(
              e?.message ??
                "メール設定の読み込みに失敗しました（API未実装/テーブル未作成の可能性）",
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

  if (loading) {
    return (
      <div className="text-gray-600 dark:text-gray-400">読み込み中...</div>
    );
  }

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
    const target = form?.fields[index];
    if (target && target.label) {
      if (isClassField(target.label)) {
        alert("この項目（体験コース）はシステムで必須のため、削除できません。");
        return;
      }
      if (isDateField(target.label)) {
        alert("この項目（体験レッスン日時）はシステムで必須のため、削除できません。");
        return;
      }
      if (isNameField(target.label)) {
        alert("この項目（お名前）はシステムで必須のため、削除できません。");
        return;
      }
      if (isEmailField(target.label)) {
        alert("この項目（メールアドレス）はシステムで必須のため、削除できません。");
        return;
      }
      if (isPhoneField(target.label)) {
        alert("この項目（電話番号）はシステムで必須のため、削除できません。");
        return;
      }
      if (isQuestionField(target.label)) {
        alert("この項目（質問など）はシステムで利用するため、削除できません。");
        return;
      }
    }
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

        // 返却がフォーム本体なら反映（{ok:true}の場合は現在の form を正として originalForm を更新）
        if (data?.id && data?.fields) {
          const fd = ensureRequiredFields(data);
          setForm(fd);
          setOriginalForm(JSON.parse(JSON.stringify(fd)));
        } else {
          // {ok:true} のみ返ってきた場合も現在の state を「保存済み」とする
          setOriginalForm(JSON.parse(JSON.stringify(form)));
        }
      }

      // ✅ メール設定がロードされている場合のみ保存
      if (emailSetting) {
        const res2 = await fetch("/api/admin/diagnosis/form-email", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailSetting),
        });

        const text2 = await res2.text();
        ensureJsonContentType(res2, text2);
        const data2 = JSON.parse(text2);

        if (!res2.ok) {
          setEmailErr(data2?.message ?? "メール設定の保存に失敗しました");
        } else {
          if (data2?.id) {
            setEmailSetting(data2);
            setOriginalEmail(JSON.parse(JSON.stringify(data2)));
          }
        }
      }

      alert("保存しました");
    } catch (e: any) {
      setErr(e?.message ?? "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const handleDiscard = () => {
    if (originalForm) setForm(JSON.parse(JSON.stringify(originalForm)));
    if (originalEmail) setEmailSetting(JSON.parse(JSON.stringify(originalEmail)));
    setErr(null);
    setEmailErr(null);
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <AdminPageHeader
        title="フォーム設定"
        description="体験予約フォームの項目・メール設定を管理します。変更後は保存ボタンを押してください。"
        isDirty={isDirty}
        saving={saving}
        error={topError}
        onSave={saveAll}
        onDiscard={handleDiscard}
      />

      {/* ========== フォーム基本 ========== */}
      <section className={adminCard + " space-y-3"}>
        <div className="flex items-center justify-between gap-3">
          <div className="font-semibold">フォーム基本設定</div>
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

        <div>
          <label className="block text-sm mb-1">トップに戻るボタンのURL（完了ページの遷移先）</label>
          <input
            className={INPUT_BASE}
            placeholder="https://example.com/thanks"
            value={form.thanksUrl ?? ""}
            onChange={(e) => setForm({ ...form, thanksUrl: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">体験コースの選択肢表示</label>
          <select
            className={INPUT_BASE}
            value={form.courseSelectType ?? "BOTH"}
            onChange={(e) => setForm({ ...form, courseSelectType: e.target.value })}
          >
            <option value="BOTH">コースとスケジュールの両方を表示</option>
            <option value="COURSE">コースのみ表示</option>
            <option value="SCHEDULE">スケジュールのみ表示</option>
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">体験予約フォームの「体験コース」の選択肢に表示される内容を切り替えられます。</p>
        </div>
      </section>

      {/* ========== フォーム項目 ========== */}
      <section className={adminCard + " space-y-4"}>
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
            {/* ✅ ラベル */}
            <input
              className={`col-span-3 ${INPUT_BASE}`}
              value={f.label}
              onChange={(e) => updateField(i, { label: e.target.value })}
            />

            {/* ✅ 種別 */}
            <select
              className={`col-span-2 ${INPUT_BASE}`}
              value={f.type}
              onChange={(e) => updateField(i, { type: e.target.value })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* ✅ placeholder（ここが見えない問題の対策） */}
            <input
              className={`col-span-3 ${INPUT_BASE}`}
              placeholder="例）山田 太郎"
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
                className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-gray-600"
              >
                ↑
              </button>
              <button
                disabled={i === form.fields.length - 1}
                onClick={() => moveField(i, 1)}
                type="button"
                className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-gray-600"
              >
                ↓
              </button>
              <button
                className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600 dark:border-gray-600 dark:text-red-400 disabled:opacity-40"
                onClick={() => removeField(i)}
                type="button"
                disabled={isClassField(f.label) || isDateField(f.label) || isNameField(f.label) || isEmailField(f.label) || isPhoneField(f.label) || isQuestionField(f.label)}
              >
                削除
              </button>
            </div>
            {/* ✅ SELECTの場合の選択肢編集 */}
            {f.type === "SELECT" && (
              <div className="col-span-12 mt-2">
                {isClassField(f.label) ? (
                  <div className="rounded bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    ※この項目は、コース管理画面に登録されているコースの一覧から自動的に選択肢が作成されます。ここで選択肢を入力する必要はありません。
                  </div>
                ) : (
                  <>
                    <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                      選択肢（改行区切りで入力）
                    </div>
                    <textarea
                      className={TEXTAREA_BASE}
                      rows={3}
                      placeholder="選択肢A&#13;&#10;選択肢B&#13;&#10;選択肢C"
                      value={
                        Array.isArray(f.optionsJson)
                          ? f.optionsJson.map((o: any) => o.label).join("\n")
                          : ""
                      }
                      onChange={(e) => {
                        const rawVal = e.target.value;
                        const lines = rawVal.split("\n");
                        const newOptions = lines.map((s) => ({
                          label: s,
                          value: s,
                        }));
                        updateField(i, { optionsJson: newOptions });
                      }}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* ========== メール設定（統合） ========== */}
      <section className={adminCard + " space-y-4"}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">メール設定</h3>
          {!emailSetting && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              （メール設定APIが未取得の可能性があります）
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

    </div>
  );
}
