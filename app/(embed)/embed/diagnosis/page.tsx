// app/(embed)/embed/diagnosis/page.tsx

import DiagnosisEmbedClient from "./DiagnosisEmbedClient";

export default function DiagnosisPage() {
  // ここで schoolId を固定したければ props で渡してもOK
  // 例: <DiagnosisEmbedClient schoolIdProp="links" />
  // 今回は URL クエリ (?school=links) 優先なので props なし
  return (
    <html lang="ja">
      <body className="m-0 bg-transparent">
        <div className="min-h-screen flex items-center justify-center">
          <DiagnosisEmbedClient />
        </div>
      </body>
    </html>
  );
}
