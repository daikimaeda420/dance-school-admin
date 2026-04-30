import ScheduleAdminClient from "./ScheduleAdminClient";

// 管理画面はビルド時にDBへ接続せず、リクエスト時に描画する
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="p-6">
      <ScheduleAdminClient />
    </div>
  );
}
