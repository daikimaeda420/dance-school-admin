import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/marketing/PublicInfoPage";

export const metadata: Metadata = {
  title: "利用規約",
  description: "rizboの利用規約です。",
};

export default function TermsPage() {
  return (
    <PublicInfoPage
      title="利用規約"
      description="rizboをご利用いただくにあたり、基本的な利用条件をまとめています。"
      sections={[
        {
          title: "サービスの利用",
          description: "rizboは、ダンススクールの問い合わせ対応、診断案内、予約フォーム運用を支援する管理ツールです。",
          bullets: ["登録情報は正確に管理してください", "第三者の権利を侵害する利用は禁止します", "不正アクセスや迷惑行為は禁止します"],
        },
        {
          title: "データの取り扱い",
          description: "利用者が登録した情報やフォーム送信内容は、サービス提供と運用改善のために取り扱います。",
          bullets: ["必要な範囲で保存・処理します", "安全管理に努めます", "不要な個人情報の登録は避けてください"],
        },
        {
          title: "免責事項",
          description: "サービスの内容は改善のため変更される場合があります。重要な運用判断は利用者の責任で行ってください。",
          bullets: ["機能や画面は予告なく更新される場合があります", "外部サービスの障害には責任を負いません", "法令に従って利用してください"],
        },
      ]}
    />
  );
}
