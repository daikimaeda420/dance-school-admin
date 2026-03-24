// app/help/page.tsx — Help
"use client";

import { useSession } from "next-auth/react";
import { HelpCircle } from "lucide-react";

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
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <HelpCircle aria-hidden="true" className="w-6 h-6" />
            <span>ヘルプ</span>
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            セットアップから運用までのガイドライン
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
                
                <div className="text-xs font-bold text-gray-500 mb-1 mt-2">Q&A・診断</div>
                <ol className="text-sm space-y-1 mb-5">
                  <li><a className="hover:underline" href="#intro">1. はじめに</a></li>
                  <li><a className="hover:underline" href="#quickstart">2. クイックスタート</a></li>
                  <li><a className="hover:underline" href="#tips">3. 作り方のコツ</a></li>
                  <li><a className="hover:underline" href="#troubleshoot">4. トラブルシュート</a></li>
                  <li><a className="hover:underline" href="#shortcuts">5. ショートカット</a></li>
                  <li><a className="hover:underline" href="#glossary">6. 用語集</a></li>
                  <li><a className="hover:underline" href="#data">7. データの取り扱い</a></li>
                  <li><a className="hover:underline" href="#contact">8. お問い合わせ</a></li>
                  <li><a className="hover:underline" href="#changelog">9. 更新情報</a></li>
                </ol>

                <div className="text-xs font-bold text-gray-500 mb-1">フォーム管理</div>
                <ol className="text-sm space-y-1">
                  <li><a className="hover:underline" href="#form-basic">1. 基本設定</a></li>
                  <li><a className="hover:underline" href="#form-items">2. 項目の管理</a></li>
                  <li><a className="hover:underline" href="#form-required">3. 必須項目の仕様</a></li>
                  <li><a className="hover:underline" href="#form-email">4. メール送信設定</a></li>
                  <li><a className="hover:underline" href="#form-summary">全体をひとことで言うと</a></li>
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

              <div className="mt-16 mb-6 border-b pb-2">
                <h2 className="text-2xl font-bold">フォーム管理</h2>
              </div>

              <Section id="form-basic" title="1. フォームの基本設定">
                <p className="mb-4">フォーム全体の基本情報を設定できます。</p>
                <ul className="list-disc pl-5 space-y-4">
                  <li>
                    <b>公開 / 非公開を切り替えられる</b>
                    <ul className="list-disc pl-5 mt-1 text-gray-600 dark:text-gray-400">
                      <li>今フォームを使える状態にするか</li>
                      <li>一時的に止めるか</li>
                    </ul>
                    <p className="mt-1">を選べます。</p>
                  </li>
                  <li>
                    <b>タイトルや説明文を変えられる</b>
                    <ul className="list-disc pl-5 mt-1 text-gray-600 dark:text-gray-400">
                      <li>例：「体験レッスン予約フォーム」</li>
                      <li>例：「以下をご入力ください」</li>
                    </ul>
                    <p className="mt-1">のような表示を自由に編集できます。</p>
                  </li>
                  <li>
                    <b>送信後に戻る先を決められる</b>
                    <div className="mt-1 text-gray-600 dark:text-gray-400">
                      フォーム送信完了後に表示される<br />
                      「トップに戻る」ボタンを押したとき、どのURLに飛ばすか設定できます。
                    </div>
                  </li>
                </ul>
              </Section>

              <Section id="form-items" title="2. フォーム項目の管理">
                <p className="mb-4">フォームの入力項目を、自分で追加したり並び替えたりできます。</p>
                <p className="mb-2">できることは以下の通りです。</p>
                <ul className="list-disc pl-5 space-y-1 mb-6">
                  <li>項目を<b>追加できる</b></li>
                  <li>項目を<b>削除できる</b></li>
                  <li>項目の順番を<b>入れ替えできる</b></li>
                </ul>
                <p className="mb-2">対応している項目の例：</p>
                <ul className="list-disc pl-5 space-y-1 mb-6 text-gray-600 dark:text-gray-400">
                  <li>1行の文字入力</li>
                  <li>メールアドレス</li>
                  <li>電話番号</li>
                  <li>長文入力</li>
                  <li>プルダウン選択</li>
                  <li>チェックボックス</li>
                  <li>日付</li>
                  <li>ユーザーには見えない隠し項目</li>
                </ul>
                <p className="mb-2">さらに、各項目ごとに以下も設定できます。</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><b>必須にするか</b></li>
                  <li><b>任意にするか</b></li>
                  <li>入力例を出すか</li>
                  <li>選択肢を何にするか</li>
                </ul>
              </Section>

              <Section id="form-required" title="3. ただし、絶対に必要な項目は消せない">
                <p className="mb-4">
                  予約に必要な最低限の情報は、最初から固定で入っています。<br />
                  これは<b>削除できません</b>。
                </p>
                <p className="mb-2">消せない項目はこの6つです。</p>
                <ul className="list-disc pl-5 space-y-1 mb-6 text-gray-600 dark:text-gray-400">
                  <li>お名前</li>
                  <li>メールアドレス</li>
                  <li>電話番号</li>
                  <li>体験コース</li>
                  <li>体験レッスン日時</li>
                  <li>質問など</li>
                </ul>
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md mb-6">
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-0">
                    つまり、<br />
                    予約に必要な基本情報は必ず取れるようにしておきつつ、<br />
                    それ以外の質問は自由に追加できる<br />
                    ということです。
                  </p>
                </div>
                <p className="mb-2">たとえば、</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
                  <li>ダンス経験の有無</li>
                  <li>年齢層</li>
                  <li>希望ジャンル</li>
                  <li>何を見て知ったか</li>
                </ul>
                <p className="mt-2">といった独自項目は後から追加できます。</p>
              </Section>

              <Section id="form-email" title="4. メール送信設定">
                <p className="mb-6">フォーム送信後に送られるメールの設定もできます。</p>
                
                <h3 className="text-lg font-bold border-l-4 border-gray-300 pl-2 mb-3">管理者向け</h3>
                <p className="mb-2">予約が入ったときに、運営側へ通知メールを送れます。</p>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">設定できるもの：</p>
                <ul className="list-disc pl-5 space-y-1 mb-8 text-gray-600 dark:text-gray-400">
                  <li>誰に送るか（To）</li>
                  <li>CC</li>
                  <li>BCC</li>
                  <li>件名</li>
                  <li>本文</li>
                </ul>

                <h3 className="text-lg font-bold border-l-4 border-gray-300 pl-2 mb-3">ユーザー向け</h3>
                <p className="mb-2">申し込んだ本人にも、自動返信メールを送れます。</p>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">設定できるもの：</p>
                <ul className="list-disc pl-5 space-y-1 mb-8 text-gray-600 dark:text-gray-400">
                  <li>自動返信を使うかどうか</li>
                  <li>件名</li>
                  <li>本文</li>
                </ul>

                <h3 className="text-lg font-bold border-l-4 border-gray-300 pl-2 mb-3">送信元情報</h3>
                <p className="mb-2">メールの差出人情報も変更できます。</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
                  <li>送信者名</li>
                  <li>送信元メールアドレス</li>
                  <li>返信先アドレス</li>
                </ul>
              </Section>

              <Section id="form-summary" title="全体をひとことで言うと">
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  「予約に必要な最低限の項目は固定で守りつつ、<br />それ以外は自由にカスタマイズできるフォーム管理機能」
                </p>
                <p className="mt-2">です。</p>
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
