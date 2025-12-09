// app/(embed)/embed/diagnosis/page.tsx

import { Suspense } from "react";
import DiagnosisEmbedClient from "./DiagnosisEmbedClient";

// URLクエリなどに依存するので、静的生成ではなく動的にする
export const dynamic = "force-dynamic";

export default function DiagnosisPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white px-4 py-3 text-xs text-gray-500 shadow">
            診断ウィジェットを読み込み中です…
          </div>
        }
      >
        <DiagnosisEmbedClient />
      </Suspense>
    </div>
  );
}
