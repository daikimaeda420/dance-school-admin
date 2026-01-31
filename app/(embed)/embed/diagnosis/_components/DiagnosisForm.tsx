"use client";

import { useEffect, useMemo, useState } from "react";

type Field = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string | null;
};

type SelectOption = { value: string; label: string };

type Props = {
  form: {
    title?: string | null;
    description?: string | null;
    fields: Field[];
  };
  hiddenValues?: Record<string, string>;

  // ✅ 追加：DiagnosisEmbedClient から注入
  classOptions?: SelectOption[];
  dateOptions?: SelectOption[];
};

const BROWN = "text-[#6b4a2b]";
const INPUT =
  "w-full rounded-2xl bg-[#f1ede6] px-5 py-4 text-[14px] " +
  "text-[#6b4a2b] placeholder:text-[#b5aa9a] outline-none " +
  "ring-1 ring-black/5 focus:ring-2 focus:ring-[#f5c400]/40";

const LABEL = "block text-[13px] font-extrabold text-[#6b4a2b]";
const SUB = "mt-1 text-[11px] font-semibold text-[#6b4a2b]/60";

// ✅ select を画像寄せ（白＋影＋右に▾）
function SelectLike(props: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  options: SelectOption[];
}) {
  const { value, onChange, required, placeholder, options } = props;

  return (
    <div className="mt-2 rounded-2xl bg-white px-4 py-4 shadow-[0_10px_22px_rgba(0,0,0,0.12)] ring-1 ring-black/10">
      <div className="relative">
        <select
          className={[
            "w-full appearance-none bg-transparent pr-10",
            "text-[14px] font-semibold text-[#6b4a2b] outline-none",
            value ? "" : "text-[#b5aa9a]",
          ].join(" ")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        >
          <option value="">{placeholder ?? "---"}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[#6b4a2b]/50">
          ▾
        </span>
      </div>
    </div>
  );
}

export default function DiagnosisForm({
  form,
  hiddenValues,
  classOptions = [],
  dateOptions = [],
}: Props) {
  const schoolId = useMemo(() => hiddenValues?.schoolId ?? "", [hiddenValues]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const setVal = (fieldId: string, v: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: v }));
  };

  const toSendFields = () => {
    const out: Record<string, string> = {};
    for (const f of form.fields) out[f.label] = values[f.id] ?? "";
    return out;
  };

  const findField = (keywords: string[]) =>
    form.fields.find((f) => keywords.some((k) => f.label.includes(k)));

  const nameField = findField(["おなまえ", "お名前", "氏名"]);
  const emailField = findField(["メール", "Mail", "E-mail", "Email"]);
  const telField = findField(["電話", "TEL", "tel"]);
  const classField = findField(["体験クラス", "クラス"]);
  const dateField = findField(["体験日", "日程", "日時"]);
  const msgField = form.fields.find((f) => f.type === "TEXTAREA");

  // ✅ options が入ってきたら、未入力時に先頭を自動選択（必須対策）
  useEffect(() => {
    if (
      classField &&
      classOptions.length > 0 &&
      !(values[classField.id] ?? "")
    ) {
      // placeholderを残したいならこの行は消してOK
      // setVal(classField.id, classOptions[0].value);
    }
    if (dateField && dateOptions.length > 0 && !(values[dateField.id] ?? "")) {
      // setVal(dateField.id, dateOptions[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classField?.id, dateField?.id, classOptions.length, dateOptions.length]);

  const usedIds = new Set(
    [nameField, emailField, telField, classField, dateField, msgField]
      .filter(Boolean)
      .map((f) => (f as Field).id),
  );
  const restFields = form.fields.filter((f) => !usedIds.has(f.id));

  return (
    <section className="mt-8">
      <div className="rounded-[28px] bg-white px-6 pt-7 pb-6 shadow-[0_10px_25px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
        {/* ここは前回のデザインのまま（必要なら文言も差し替えOK） */}
        <div className="text-center">
          <h2 className={`text-[26px] font-extrabold ${BROWN}`}>体験予約</h2>
          {form.title && (
            <div className="mt-2 text-[14px] font-bold text-[#6b4a2b]/85">
              {form.title}
            </div>
          )}
          {form.description && (
            <div className="mt-3 text-[12px] font-semibold text-[#6b4a2b]/70 whitespace-pre-wrap">
              {form.description}
            </div>
          )}
        </div>

        <div className="my-7 h-px w-full bg-black/10" />

        <div className="text-center">
          <div className={`text-[24px] font-extrabold ${BROWN}`}>
            体験予約フォーム
          </div>
        </div>

        {done ? (
          <div className="mt-5 rounded-2xl bg-[#ecf8ee] px-4 py-4 text-[13px] font-semibold text-green-800 ring-1 ring-green-200">
            送信が完了しました。ご連絡をお待ちください。
          </div>
        ) : (
          <form
            className="mt-6 space-y-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);

              if (!schoolId) {
                setErr(
                  "schoolId が取得できません（hiddenValues.schoolId が必要です）",
                );
                return;
              }

              setSending(true);
              try {
                const res = await fetch("/api/diagnosis/submit", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    schoolId,
                    fields: toSendFields(),
                    hiddenValues: hiddenValues ?? {},
                  }),
                });

                const data = await res.json().catch(() => null);
                if (!res.ok)
                  throw new Error(data?.message ?? "送信に失敗しました");
                setDone(true);
              } catch (e: any) {
                setErr(e?.message ?? "送信に失敗しました");
              } finally {
                setSending(false);
              }
            }}
          >
            {nameField && (
              <div>
                <label className={LABEL}>
                  {nameField.label}
                  {nameField.required && (
                    <span className="ml-1 text-[#6b4a2b]/70">（必須）</span>
                  )}
                </label>
                <input
                  className={INPUT}
                  type="text"
                  required={nameField.required}
                  placeholder={nameField.placeholder ?? "だんす たろう"}
                  value={values[nameField.id] ?? ""}
                  onChange={(e) => setVal(nameField.id, e.target.value)}
                />
              </div>
            )}

            {emailField && (
              <div>
                <label className={LABEL}>
                  {emailField.label}
                  {emailField.required && (
                    <span className="ml-1 text-[#6b4a2b]/70">（必須）</span>
                  )}
                </label>
                <input
                  className={INPUT}
                  type="email"
                  required={emailField.required}
                  placeholder={emailField.placeholder ?? "xxx.xxxxx@sample.com"}
                  value={values[emailField.id] ?? ""}
                  onChange={(e) => setVal(emailField.id, e.target.value)}
                />
              </div>
            )}

            {telField && (
              <div>
                <label className={LABEL}>
                  {telField.label}
                  {telField.required && (
                    <span className="ml-1 text-[#6b4a2b]/70">（必須）</span>
                  )}
                </label>
                <div className={SUB}>※ハイフン不要</div>
                <input
                  className={INPUT}
                  type="tel"
                  required={telField.required}
                  placeholder={telField.placeholder ?? "09011112222"}
                  value={values[telField.id] ?? ""}
                  onChange={(e) => setVal(telField.id, e.target.value)}
                />
              </div>
            )}

            <div className="h-px w-full bg-black/10" />

            {/* ✅ 体験クラス：schedule 由来 options を select に */}
            {classField && (
              <div>
                <label className={LABEL}>
                  {classField.label}
                  {classField.required && (
                    <span className="ml-1 text-[#6b4a2b]/70">（必須）</span>
                  )}
                </label>

                {classOptions.length > 0 ? (
                  <SelectLike
                    value={values[classField.id] ?? ""}
                    onChange={(v) => setVal(classField.id, v)}
                    required={classField.required}
                    placeholder={classField.placeholder ?? "選択してください"}
                    options={classOptions}
                  />
                ) : (
                  <input
                    className={INPUT}
                    required={classField.required}
                    placeholder={
                      classField.placeholder ?? "（スケジュール読込中）"
                    }
                    value={values[classField.id] ?? ""}
                    onChange={(e) => setVal(classField.id, e.target.value)}
                  />
                )}
              </div>
            )}

            <div className="h-px w-full bg-black/10" />

            {/* ✅ 体験日：生成した日付 options を select に */}
            {dateField && (
              <div>
                <label className={LABEL}>
                  {dateField.label}
                  {dateField.required && (
                    <span className="ml-1 text-[#6b4a2b]/70">（必須）</span>
                  )}
                </label>

                {dateOptions.length > 0 ? (
                  <SelectLike
                    value={values[dateField.id] ?? ""}
                    onChange={(v) => setVal(dateField.id, v)}
                    required={dateField.required}
                    placeholder={dateField.placeholder ?? "---"}
                    options={dateOptions}
                  />
                ) : (
                  <input
                    className={INPUT}
                    required={dateField.required}
                    placeholder={dateField.placeholder ?? "---"}
                    value={values[dateField.id] ?? ""}
                    onChange={(e) => setVal(dateField.id, e.target.value)}
                  />
                )}
              </div>
            )}

            {msgField && (
              <div>
                <label className={LABEL}>
                  {msgField.label}
                  {msgField.required && (
                    <span className="ml-1 text-[#6b4a2b]/70">（必須）</span>
                  )}
                </label>
                <div className={SUB}>
                  ※複数名で参加希望の場合、お客様ごとにご予約ください
                </div>
                <textarea
                  className={INPUT + " min-h-[170px] resize-none"}
                  rows={6}
                  required={msgField.required}
                  placeholder={msgField.placeholder ?? ""}
                  value={values[msgField.id] ?? ""}
                  onChange={(e) => setVal(msgField.id, e.target.value)}
                />
              </div>
            )}

            {restFields.length > 0 && (
              <div className="space-y-6">
                {restFields.map((f) => (
                  <div key={f.id}>
                    <label className={LABEL}>
                      {f.label}
                      {f.required && (
                        <span className="ml-1 text-[#6b4a2b]/70">（必須）</span>
                      )}
                    </label>
                    {f.type === "TEXTAREA" ? (
                      <textarea
                        className={INPUT + " min-h-[140px] resize-none"}
                        rows={5}
                        required={f.required}
                        placeholder={f.placeholder ?? undefined}
                        value={values[f.id] ?? ""}
                        onChange={(e) => setVal(f.id, e.target.value)}
                      />
                    ) : (
                      <input
                        className={INPUT}
                        type={
                          f.type === "EMAIL"
                            ? "email"
                            : f.type === "TEL"
                              ? "tel"
                              : "text"
                        }
                        required={f.required}
                        placeholder={f.placeholder ?? undefined}
                        value={values[f.id] ?? ""}
                        onChange={(e) => setVal(f.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {err && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700 ring-1 ring-red-200">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className={[
                "w-full rounded-full py-4 text-[16px] font-extrabold",
                "bg-[#f5c400] text-[#6b4a2b]",
                "shadow-[0_16px_30px_rgba(0,0,0,0.15)]",
                "active:scale-[0.99] disabled:opacity-60",
              ].join(" ")}
            >
              {sending ? "送信中..." : "体験レッスンを申し込む"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
