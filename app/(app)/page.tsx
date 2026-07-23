import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default function HomePage() {
  // ページ遷移を同一アプリ内APIの応答待ちで止めない。描画後にクライアント側で取得し、
  // 既存の読み込みUIを即座に表示する。
  return <HomeClient initialDashboard={null} />;
}
