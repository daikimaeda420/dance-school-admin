"use client";

import { useEffect, useState } from "react";

type Field = {
  id?: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string | null;
  isActive?: boolean;
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
];

export default function FormAdminClient({ schoolId }: { schoolId: string }) {
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 初期取得（なければ自動生成される）
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/diagnosis/form?schoolId=${schoolId}`);
      const json = await res.json();
      setForm(json);
      setLoading(false);
    })();
  }, [schoolId]);

  if (loading) return <div>読み込み中...</div>;
  if (!form) return <div>フォームが見つかりません</div>;

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
        {
          label: "新しい項目",
          type: "TEXT",
          required: false,
        },
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
    await fetch("/api/admin/diagnosis/form", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    alert("保存しました");
  }

  return (
    <div className="space-y-6">
      {/* 基本設定 */}
      <section className="rounded-xl border p-4 space-y-3">
        <label className="flex items-center gap-2">
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
            className="w-full rounded border px-3 py-2"
            value={form.title ?? ""}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">説明文</label>
          <textarea
            className="w-full rounded border px-3 py-2"
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </section>

      {/* フィールド編集 */}
      <section className="rounded-xl border p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">フォーム項目</h3>
          <button
            className="rounded bg-blue-600 text-white px-3 py-1"
            onClick={addField}
          >
            ＋ 項目追加
          </button>
        </div>

        {form.fields.map((f, i) => (
          <div
            key={i}
            className="rounded border p-3 grid grid-cols-12 gap-2 items-center"
          >
            <input
              className="col-span-3 rounded border px-2 py-1"
              value={f.label}
              onChange={(e) => updateField(i, { label: e.target.value })}
            />

            <select
              className="col-span-2 rounded border px-2 py-1"
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
              className="col-span-3 rounded border px-2 py-1"
              placeholder="placeholder"
              value={f.placeholder ?? ""}
              onChange={(e) => updateField(i, { placeholder: e.target.value })}
            />

            <label className="col-span-2 flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={f.required}
                onChange={(e) => updateField(i, { required: e.target.checked })}
              />
              必須
            </label>

            <div className="col-span-2 flex gap-1 justify-end">
              <button disabled={i === 0} onClick={() => moveField(i, -1)}>
                ↑
              </button>
              <button
                disabled={i === form.fields.length - 1}
                onClick={() => moveField(i, 1)}
              >
                ↓
              </button>
              <button className="text-red-600" onClick={() => removeField(i)}>
                削除
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* 保存 */}
      <div className="text-right">
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-green-600 text-white px-6 py-2"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  );
}
