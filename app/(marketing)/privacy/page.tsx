import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/marketing/PublicInfoPage";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "rizboのプライバシーポリシーです。",
};

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      title="プライバシーポリシー"
      description="rizboにおける情報の取得、利用、管理についての基本方針をまとめています。"
      sections={[
        {
          title: "取得する情報",
          description: "サービス提供に必要な範囲で、アカウント情報、設定情報、フォーム送信内容、利用ログを取得する場合があります。",
          bullets: ["アカウント情報", "フォーム送信内容", "サービス利用ログ"],
        },
        {
          title: "利用目的",
          description: "取得した情報は、サービス提供、問い合わせ対応、機能改善、セキュリティ維持のために利用します。",
          bullets: ["問い合わせ対応", "予約導線の改善", "不正利用の防止"],
        },
        {
          title: "管理とお問い合わせ",
          description: "情報の安全管理に努め、必要に応じて開示・訂正・削除などの相談を受け付けます。",
          bullets: ["適切なアクセス管理", "必要な範囲での保管", "rizbo@dansul.jp で受付"],
        },
      ]}
    />
  );
}
