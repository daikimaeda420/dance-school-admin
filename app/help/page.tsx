// app/help/page.tsx — Help
"use client";

import { useSession } from "next-auth/react";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="text-sm leading-7 text-gray-700 dark:text-gray-300">
        {children}
      </div>
    </section>
  );
}

export default function HelpPage() {
  const { status } = useSession();

  return (
    <main className="min-h-[80vh]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">ヘルプ</h1>
          <p className="mt-1 text-sm text-gray-600">
            セットアップから運用、トラブル対応まで
          </p>
        </div>

        {status === "loading" ? (
          <p className="p-6">読み込み中...</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
            {/* 目次 */}
            <nav className="lg:sticky lg:top-20 self-start">
              <div className="card p-4">
                <div className="text-sm font-semibold mb-2">目次</div>
                <ol className="text-sm space-y-1">
                  <li>
                    <a className="hover:underline" href="#intro">
                      1. はじめに
                    </a>
                  </li>
                  <li>
                    <a className="hover:underline" href="#quickstart">
                      2. クイックスタート
                    </a>
                  </li>
                  <li>
                    <a className="hover:underline" href="#tips">
                      3. 作り方のコツ
                    </a>
                  </li>
                  <li>
                    <a className="hover:underline" href="#troubleshoot">
                      4. トラブルシュート
                    </a>
                  </li>
                  <li>
                    <a className="hover:underline" href="#shortcuts">
                      5. ショートカット
                    </a>
                  </li>
                  <li>
                    <a className="hover:underline" href="#glossary">
                      6. 用語集
                    </a>
                  </li>
                  <li>
                    <a className="hover:underline" href="#data">
                      7. データの取り扱い
                    </a>
                  </li>
                  <li>
                    <a className="hover:underline" href="#contact">
                      8. お問い合わせ
                    </a>
                  </li>
                  <li>
                    <a className="hover:underline" href="#changelog">
                      9. 更新情報
                    </a>
                  </li>
                </ol>
              </div>
            </nav>

            {/* コンテンツ */}
            <div className="space-y-10">
              <Section id="intro" title="1. はじめに">
                <p className="mb-2">
                  <b>
                    この管理画面では、サイト埋め込み型のQ&A（分岐型FAQ）を作成・運用できます。
                  </b>
                </p>
                <p>
                  初めての方は「クイックスタート」から始めてください（約3分）。
                </p>
              </Section>

              <Section id="quickstart" title="2. クイックスタート">
                <ol className="list-decimal pl-5 space-y-1">
                  <li>
                    <b>Q&A編集</b>
                    で「新規作成」→「select（選択肢）」または「question（質問）」を追加
                  </li>
                  <li>
                    分岐をつなげて<b>プレビュー</b>で動作確認
                  </li>
                  <li>
                    問題なければ<b>ドラフトを公開</b>
                  </li>
                  <li>
                    <b>設定 → 埋め込みコード</b>をコピーしてサイトに設置
                  </li>
                </ol>
              </Section>

              <Section id="tips" title="3. よくある作り方のコツ">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    最初の階層は「受講目的」や「年齢」など<b>大分類</b>にする
                  </li>
                  <li>
                    3階層以内で<b>答え</b>に到達できる導線を意識
                  </li>
                  <li>
                    各ノードには<b>一意のラベル</b>と<b>簡潔な文言</b>を付与
                  </li>
                  <li>
                    外部リンクは<b>新規タブ</b>＋<b>短い説明</b>付きに
                  </li>
                </ul>
              </Section>

              <Section id="troubleshoot" title="4. トラブルシュート">
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">入力してもフォーカスが外れる</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      自動再レンダー抑制のため、入力コンポーネントの{" "}
                      <code>key</code> や <code>useEffect</code> 依存を確認
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">公開したのに反映されない</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      キャッシュをクリア、ドラフト/公開ステータスの確認
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">分岐が途中で止まる</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      バリデーションで「行き止まりノード」をチェック
                    </p>
                  </div>
                </div>
              </Section>

              <Section id="shortcuts" title="5. キーボードショートカット">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <b>⌘K / Ctrl+K</b>：グローバル検索
                  </li>
                  <li>
                    <b>⌘S / Ctrl+S</b>：下書き保存
                  </li>
                  <li>
                    <b>?</b>：このヘルプを開く
                  </li>
                </ul>
              </Section>

              <Section id="glossary" title="6. 用語集">
                <dl className="space-y-2">
                  <div>
                    <dt className="font-medium">セッションID</dt>
                    <dd className="text-gray-600 dark:text-gray-400">
                      同一ユーザーの連続利用を識別するID
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">schoolId</dt>
                    <dd className="text-gray-600 dark:text-gray-400">
                      スクール固有の識別子（school-admin のスコープに使用）
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">ドラフト/公開</dt>
                    <dd className="text-gray-600 dark:text-gray-400">
                      編集中の保存と、実際に配信される状態
                    </dd>
                  </div>
                </dl>
              </Section>

              <Section id="data" title="7. データの取り扱い">
                <p>
                  ログには質問・選択の履歴が含まれます。個人情報は収集しません。エクスポート/削除ポリシーは
                  <b>設定 → データ管理</b>をご参照ください。
                </p>
              </Section>

              <Section id="contact" title="8. お問い合わせ">
                <p>
                  運用相談・不具合報告は<b>アカウント管理 → 連絡先</b>
                  をご参照ください。返信目安：1〜2営業日。
                </p>
              </Section>

              <Section id="changelog" title="9. 更新情報">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <b>v0.1.0</b>
                    ：Q&Aドラフト/公開、簡易KPI、バリデーション、CSV出力を追加
                  </li>
                  <li>
                    <b>次回予告</b>：⌘K検索、通知センター、詳細アナリティクス
                  </li>
                </ul>
              </Section>

              <div className="pt-6">
                <a href="#" className="text-sm hover:underline">
                  ▲ ページの先頭へ
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
