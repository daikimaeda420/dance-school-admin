import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/marketing/PublicInfoPage";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "rizboへのお問い合わせ、導入相談の連絡先です。",
};

export default function ContactPage() {
  return (
    <PublicInfoPage
      title="お問い合わせ"
      description="導入相談、機能の確認、運用に関するご相談はフォームまたはメールでお問い合わせください。"
      ctaTitle="導入の相談・お問い合わせ"
      ctaText="スクールの状況に合わせて、使い方と導入手順を整理してご案内します。"
      sections={[
        {
          title: "導入の相談",
          description: "まずは現在の問い合わせ対応や体験予約までの流れを確認し、必要な機能を整理します。",
          bullets: ["運用状況のヒアリング", "必要な機能の整理", "導入手順の確認"],
        },
        {
          title: "メールで連絡",
          description: "フォームを使わずに連絡したい場合は、rizbo@dansul.jp までご連絡ください。",
          bullets: ["返信目安は1〜2営業日", "スクール名を添えて送信", "確認したい内容を記載"],
        },
        {
          title: "導入後の相談",
          description: "公開後の改善や、FAQ・診断・フォームの見直しもご相談いただけます。",
          bullets: ["質問ログの見直し", "フォーム項目の整理", "レポートを使った改善"],
        },
      ]}
    />
  );
}
