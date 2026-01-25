"use client";

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
  return (
    <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100">
      {form.title && <h2 className="mb-2 text-xl font-bold">{form.title}</h2>}
      {form.description && (
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
          {form.description}
        </p>
      )}

      <form className="space-y-4">
        {/* hidden（診断結果用） */}
        {hiddenValues &&
          Object.entries(hiddenValues).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}

        {form.fields.map((f) => {
          // ✅ label は人間向けなので name は id を推奨（重複や日本語の問題を避ける）
          const name = `field_${f.id}`;

          const common = {
            name,
            required: f.required,
            placeholder: f.placeholder ?? undefined,
            className: INPUT_BASE,
          };

          return (
            <div key={f.id} className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                {f.label}
                {f.required && (
                  <span className="ml-2 text-xs font-semibold text-red-500">
                    必須
                  </span>
                )}
              </label>

              {(() => {
                switch (f.type) {
                  case "TEXTAREA":
                    return <textarea {...common} rows={4} />;

                  case "EMAIL":
                    return <input type="email" {...common} />;

                  case "TEL":
                    return <input type="tel" {...common} />;

                  default:
                    return <input type="text" {...common} />;
                }
              })()}
            </div>
          );
        })}

        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 active:bg-blue-800"
        >
          送信する
        </button>

        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          ※送信前に入力内容をご確認ください
        </p>
      </form>
    </section>
  );
}
