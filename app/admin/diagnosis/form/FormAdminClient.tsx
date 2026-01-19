"use client";

import { useEffect, useState } from "react";

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

const FIELD_TYPES = [
  "TEXT",
  "EMAIL",
  "TEL",
  "TEXTAREA",
  "SELECT",
  "CHECKBOX",
  "HIDDEN",
] as const;

export default function FormAdminClient({ schoolId }: { schoolId: string }) {
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(
          `/api/admin/diagnosis/form?schoolId=${encodeURIComponent(schoolId)}`,
          { cache: "no-store" },
        );

        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `APIがJSONを返していません (status=${res.status}). ${text.slice(
              0,
              120,
            )}`,
          );
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message ?? "API error");

        if (!cancelled) setForm(data);
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

  if (err) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
        {err}
      </div>
    );
  }

  if (!form)
    return (
      <div className="text-gray-600 dark:text-gray-400">
        フォームが見つかりません
      </div>
    );

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

  async function save() {
    setSaving(true);
    setErr(null);

    try {
      const res = await fetch("/api/admin/diagnosis/form", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "保存に失敗しました");

      alert("保存しました");
    } catch (e: any) {
      setErr(e?.message ?? "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          フォームを表示する
        </label>

        <div>
          <label className="block text-sm mb-1">タイトル</label>
          <input
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm
                       dark:border-gray-600 dark:bg-gray-800"
            value={form.title ?? ""}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">説明文</label>
          <textarea
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm
                       dark:border-gray-600 dark:bg-gray-800"
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </section>

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
              <button disabled={i === 0} onClick={() => moveField(i, -1)}>
                ↑
              </button>
              <button
                disabled={i === form.fields.length - 1}
                onClick={() => moveField(i, 1)}
              >
                ↓
              </button>
              <button
                className="text-red-600 dark:text-red-400"
                onClick={() => removeField(i)}
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </section>

      <div className="text-right">
        <button
          onClick={save}
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
