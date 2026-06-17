import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/marketing/PublicInfoPage";

export const metadata: Metadata = {
  title: "ヘルプセンター",
  description: "rizboの導入・運用に関するヘルプセンターです。",
};

export default function SupportPage() {
  return (
    <PublicInfoPage
      title="ヘルプセンター"
      description="導入前の確認、初期設定、運用開始後の改善についてよくある相談をまとめています。"
      sections={[
        {
          title: "導入前の確認",
          description: "現在のサイト構成や予約フローに合わせて、必要な機能を整理します。",
          bullets: ["既存サイトへの設置方法", "必要なフォーム項目", "通知メールの運用"],
        },
        {
          title: "初期設定",
          description: "Q&A、診断、フォーム、通知先を整えて、公開前に動作を確認します。",
          bullets: ["FAQの登録", "診断項目の設定", "テスト送信の確認"],
        },
        {
          title: "運用改善",
          description: "運用後はログとレポートを見ながら、予約につながる導線へ調整していきます。",
          bullets: ["よくある質問の追加", "申込フォームの見直し", "レポートの読み方"],
        },
      ]}
    />
  );
}
