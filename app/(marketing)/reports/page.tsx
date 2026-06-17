import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/marketing/PublicInfoPage";

export const metadata: Metadata = {
  title: "運用レポート",
  description: "rizboの運用レポートで確認できる指標と改善アクションです。",
};

export default function ReportsPage() {
  return (
    <PublicInfoPage
      title="運用レポート"
      description="問い合わせ、診断、フォーム送信の流れを可視化し、次に直すべきポイントを見つけやすくします。"
      sections={[
        {
          title: "予約ファネル",
          description: "サイト訪問からフォーム到達、申込完了までの流れを段階ごとに確認できます。",
          bullets: ["離脱しやすい箇所を把握", "申込完了までの流れを確認", "改善前後の変化を追跡"],
        },
        {
          title: "FAQランキング",
          description: "よく見られる質問を確認し、ページやチャットボットの案内を更新できます。",
          bullets: ["問い合わせ削減の優先順位を整理", "未解決の質問を発見", "回答文の更新に活用"],
        },
        {
          title: "改善アクション",
          description: "未解決質問やフォーム離脱などから、次に取り組むべき改善候補を整理します。",
          bullets: ["CTA文言の見直し", "診断結果ページの改善", "申込フォーム項目の整理"],
        },
      ]}
    />
  );
}
