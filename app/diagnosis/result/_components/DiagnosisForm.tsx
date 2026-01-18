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

export default function DiagnosisForm({ form, hiddenValues }: Props) {
  return (
    <section className="mt-12 rounded-2xl border p-6 bg-white">
      {form.title && <h2 className="text-xl font-bold mb-2">{form.title}</h2>}
      {form.description && (
        <p className="text-sm text-gray-600 mb-6">{form.description}</p>
      )}

      <form className="space-y-4">
        {/* hidden（診断結果用） */}
        {hiddenValues &&
          Object.entries(hiddenValues).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}

        {form.fields.map((f) => {
          const common = {
            name: f.label,
            required: f.required,
            placeholder: f.placeholder ?? undefined,
            className: "w-full rounded border px-3 py-2 text-sm",
          };

          switch (f.type) {
            case "TEXTAREA":
              return <textarea key={f.id} {...common} rows={4} />;

            case "EMAIL":
              return <input key={f.id} type="email" {...common} />;

            case "TEL":
              return <input key={f.id} type="tel" {...common} />;

            default:
              return <input key={f.id} type="text" {...common} />;
          }
        })}

        <button
          type="submit"
          className="w-full rounded bg-blue-600 text-white py-3 font-semibold"
        >
          送信する
        </button>
      </form>
    </section>
  );
}
