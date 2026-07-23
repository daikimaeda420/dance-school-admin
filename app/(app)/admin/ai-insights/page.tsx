import AiInsightsClient from "./AiInsightsClient";

export const dynamic = "force-dynamic";

export default function AiInsightsPage() {
  // API集計はクライアント側で行い、遷移直後に読み込み状態を表示する。
  return <AiInsightsClient initialInsight={null} />;
}
