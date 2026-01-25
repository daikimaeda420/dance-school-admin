"use client";

import { useMemo, useState } from "react";

type Field = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string | null;
};

type Props = {
  form: {
    title?: string | null;
    description?: string | null;
    fields: Field[];
  };
  hiddenValues?: Record<string, string>;
};

const INPUT_BASE =
  "w-full rounded-xl border px-4 py-3 text-sm outline-none " +
  "border-gray-300 bg-white text-gray-900 " +
  "placeholder:text-gray-400 placeholder:opacity-100 " +
  "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 " +
  "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 " +
  "dark:placeholder:text-gray-500";

export default function DiagnosisForm({ form, hiddenValues }: Props) {
  const schoolId = useMemo(() => hiddenValues?.schoolId ?? "", [hiddenValues]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const setVal = (fieldId: string, v: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: v }));
  };

  const toSendFields = () => {
    // API側で読みやすいよう「ラベル: 値」形式も混ぜたければここで加工OK
    const out: Record<string, string> = {};
    for (const f of form.fields) out[f.label] = values[f.id] ?? "";
    return out;
  };

  return (
    <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100">
      {form.title && <h2 className="mb-2 text-xl font-bold">{form.title}</h2>}
      {form.description && (
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
          {form.description}
        </p>
      )}

      {done ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200">
          送信が完了しました。ご連絡をお待ちください。
        </div>
      ) : (
        <form
          className="space-y-4"
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
              if (!res.ok) {
                throw new Error(data?.message ?? "送信に失敗しました");
              }
              setDone(true);
            } catch (e: any) {
              setErr(e?.message ?? "送信に失敗しました");
            } finally {
              setSending(false);
            }
          }}
        >
          {form.fields.map((f) => (
            <div key={f.id} className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                {f.label}
                {f.required && (
                  <span className="ml-2 text-xs font-semibold text-red-500">
                    必須
                  </span>
                )}
              </label>

              {f.type === "TEXTAREA" ? (
                <textarea
                  className={INPUT_BASE}
                  rows={4}
                  required={f.required}
                  placeholder={f.placeholder ?? undefined}
                  value={values[f.id] ?? ""}
                  onChange={(e) => setVal(f.id, e.target.value)}
                />
              ) : (
                <input
                  className={INPUT_BASE}
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

          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {sending ? "送信中..." : "送信する"}
          </button>
        </form>
      )}
    </section>
  );
}
