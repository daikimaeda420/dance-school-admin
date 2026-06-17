import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/marketing/PublicInfoPage";

export const metadata: Metadata = {
  title: "機能一覧",
  description: "rizboのQ&Aチャットボット、相性診断、予約フォーム、運用レポートの機能一覧です。",
};

export default function FeaturesPage() {
  return (
    <PublicInfoPage
      title="機能一覧"
      description="問い合わせ対応から体験予約までの流れを、ひとつの管理画面で整えるための機能をまとめています。"
      sections={[
        {
          title: "Q&Aチャットボット",
          description: "料金、アクセス、持ち物、体験の流れなど、よくある質問にサイト上ですぐ回答できます。",
          bullets: ["営業時間外の問い合わせに対応", "よくある質問を管理画面から更新", "質問ログを確認して改善"],
        },
        {
          title: "相性診断",
          description: "年齢、目的、経験、ジャンルの好みに合わせて、体験前のお客様に合うクラスへ案内します。",
          bullets: ["回答に合わせておすすめを表示", "診断フォームの項目を管理", "申込前の迷いを減らす"],
        },
        {
          title: "予約フォーム",
          description: "体験予約につながる申込フォームを用意し、受付メールやスタッフ通知まで整えます。",
          bullets: ["必要項目を整理", "送信後メールを自動化", "申込内容を管理画面で確認"],
        },
        {
          title: "運用レポート",
          description: "フォーム到達、申込完了、よく見られる質問などを可視化して、次の改善点を見つけます。",
          bullets: ["予約ファネルを確認", "FAQランキングを確認", "改善アクションを整理"],
        },
      ]}
    />
  );
}
