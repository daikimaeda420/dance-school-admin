import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/marketing/PublicInfoPage";

export const metadata: Metadata = {
  title: "はじめ方",
  description: "rizboを導入する流れを紹介します。",
};

export default function GettingStartedPage() {
  return (
    <PublicInfoPage
      title="はじめ方"
      description="初期設定からサイト設置、運用改善まで、最短で体験予約につながる導線を作る流れです。"
      sections={[
        {
          title: "1. 初期設定",
          description: "スクール情報、よくある質問、診断項目、予約フォームの基本情報を登録します。",
          bullets: ["既存のFAQを整理", "体験予約に必要な項目を決定", "通知先メールを設定"],
        },
        {
          title: "2. サイトに設置",
          description: "発行された埋め込みコードをサイトに設置し、訪問者が迷わず相談・診断できる状態にします。",
          bullets: ["チャットボットを設置", "診断フォームを公開", "表示と送信を確認"],
        },
        {
          title: "3. 運用・改善",
          description: "質問ログや申込状況を見ながら、よく迷われるポイントを更新していきます。",
          bullets: ["多い質問をFAQに追加", "診断結果の案内を調整", "レポートから改善点を確認"],
        },
      ]}
    />
  );
}
