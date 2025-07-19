"use client";

import { useState } from "react";

export default function DeleteSchoolButton({ schoolId }: { schoolId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const confirmed = confirm(`「${schoolId}」を本当に削除しますか？`);
    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/schools?schoolId=${schoolId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const text = await res.text();
        setError(`削除失敗: ${text}`);
      }
    } catch (err) {
      setError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {loading ? "削除中…" : "削除する"}
      </button>
      {error && <div className="text-xs text-red-500">{error}</div>}
    </div>
  );
}
