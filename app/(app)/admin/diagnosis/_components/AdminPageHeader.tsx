// app/(app)/admin/diagnosis/_components/AdminPageHeader.tsx
"use client";

import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  isDirty: boolean;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onDiscard?: () => void;
  /** 保存ボタンを非表示にする（Media等、即時処理のページ用） */
  hideSave?: boolean;
};

export default function AdminPageHeader({
  title,
  description,
  isDirty,
  saving,
  error,
  onSave,
  onDiscard,
  hideSave,
}: Props) {
  return (
    <div className="mb-5 space-y-3">
      {/* タイトル行 + 保存ボタン */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>

        {!hideSave && (
          <div className="flex items-center gap-2">
            {onDiscard && isDirty && (
              <button
                type="button"
                onClick={onDiscard}
                disabled={saving}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                変更を破棄
              </button>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !isDirty}
              className="inline-flex items-center gap-2 rounded-lg bg-[#fe6147] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#eb4f35] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  保存
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 変更ありバナー */}
      {isDirty && !error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>変更した内容があります。保存ボタンを押して反映してください。</span>
        </div>
      )}

      {/* 保存成功（一時表示用に将来拡張可） */}

      {/* エラー表示 */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
