export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左2カラム：カード群 */}
      <section className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">折れ線グラフ</h3>
            </div>
            <div className="card-body h-48 grid place-items-center text-gray-400">
              {/* Chart placeholder */}
              Chart here
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">円グラフ</h3>
            </div>
            <div className="card-body h-48 grid place-items-center text-gray-400">
              Chart here
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">棒グラフ</h3>
          </div>
          <div className="card-body h-64 grid place-items-center text-gray-400">
            Chart here
          </div>
        </div>
      </section>

      {/* 右カラム：KPI/ボタン群 */}
      <aside className="space-y-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">指標</h3>
          </div>
          <div className="card-body space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">売上（今月）</span>
              <span className="text-xl font-bold text-gray-900">99,999</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">CVR</span>
              <span className="text-xl font-bold text-gray-900">5.4%</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">ボタン</h3>
          </div>
          <div className="card-body space-y-3">
            <button className="btn-primary w-full">決定/保存ボタン</button>
            <button className="btn-ghost w-full">キャンセルボタン</button>
            <button className="btn-danger w-full">削除ボタン</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
