import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "rizboのQ&Aチャットボット、相性診断、予約フォーム、管理画面、運用レポートで取り扱う情報と利用目的を定めたプライバシーポリシーです。",
};

const SOFT_GRADIENT =
  "radial-gradient(circle at 18% 18%, rgba(255,225,215,0.72) 0%, rgba(255,225,215,0) 34%), radial-gradient(circle at 86% 22%, rgba(255,228,238,0.78) 0%, rgba(255,228,238,0) 36%), linear-gradient(135deg, #ffffff 0%, #fff7f1 48%, #ffeef4 100%)";

const FOOTER_COLUMNS = [
  {
    title: "プロダクト",
    links: [
      { label: "機能一覧", href: "/features" },
      { label: "はじめ方", href: "/getting-started" },
      { label: "運用レポート", href: "/reports" },
    ],
  },
  {
    title: "サポート",
    links: [
      { label: "ヘルプセンター", href: "/support" },
      { label: "お問い合わせ", href: "/contact" },
      { label: "利用規約", href: "/terms" },
    ],
  },
  {
    title: "会社情報",
    links: [
      { label: "運営会社", href: "https://dansul.jp/", external: true },
      { label: "プライバシーポリシー", href: "/privacy" },
    ],
  },
];

const sections = [
  {
    title: "1. 運営者情報",
    body: [
      "rizboは、ダンススクールの問い合わせ対応、体験予約導線、運用改善を支援するサービスです。本ポリシーにおける運営者は以下のとおりです。",
    ],
    definitionList: [
      { term: "運営者", description: "ダンスル運営事務局" },
      { term: "住所", description: "〒555-0033 大阪府大阪市西淀川区姫島1丁目7-25" },
      { term: "お問い合わせ", description: "rizbo@dansul.jp" },
    ],
  },
  {
    title: "2. rizboのサービス内容",
    body: [
      "rizboは、ダンススクール向けに、Q&Aチャットボット、相性診断、予約・問い合わせフォーム、管理画面、運用レポートを提供します。",
      "スクール運営者は管理画面からFAQ、診断結果、コース、校舎、講師、スケジュール、フォーム項目、メール通知内容などを設定できます。サイト訪問者は、チャットや診断、フォームを通じて必要な情報を確認し、体験予約や問い合わせを行うことができます。",
    ],
  },
  {
    title: "3. 取得する情報",
    body: [
      "当サービスでは、サービス提供に必要な範囲で以下の情報を取得・保存する場合があります。",
    ],
    bullets: [
      "管理者アカウント情報: 氏名、メールアドレス、権限、schoolId、パスワードハッシュ",
      "スクール設定情報: FAQ、診断設定、コース、校舎、講師、画像、動画URL、スケジュール、フォーム項目、メール設定",
      "チャット利用ログ: sessionId、質問、回答、URL、日時、schoolId",
      "診断利用ログ: sessionId、診断ステップ、選択内容、フォーム到達・送信などのイベント",
      "予約・問い合わせフォーム送信内容: 氏名、メールアドレス、電話番号、希望内容など、スクールが設定した入力項目",
      "LP導入相談フォーム: スクール名、氏名、メールアドレス、電話番号、相談内容",
    ],
  },
  {
    title: "4. 利用目的",
    body: ["取得した情報は、以下の目的で利用します。"],
    bullets: [
      "Q&Aチャットボット、相性診断、予約フォーム、管理画面、運用レポートの提供",
      "スクール運営者への通知、フォーム送信者への自動返信、問い合わせ対応",
      "体験予約までの導線、FAQ、診断結果、フォーム項目の改善",
      "利用状況の集計、レポート作成、未解決質問や離脱ポイントの把握",
      "本人確認、ログイン管理、不正利用の防止、セキュリティ維持",
      "契約管理、サポート対応、重要なお知らせの連絡",
    ],
  },
  {
    title: "5. Cookie・localStorage・sessionStorage等の利用",
    body: [
      "当サービスでは、ログイン状態の維持、テーマ設定、チャットや診断のセッション識別、診断回答の一時保存、離脱ファネル計測のために、Cookie、localStorage、sessionStorageまたはこれに類するブラウザ保存機能を利用する場合があります。",
      "これらは、同一ブラウザ内での表示・操作の継続性を保つこと、サービス利用状況を集計すること、予約導線の改善に役立てることを目的としています。",
    ],
  },
  {
    title: "6. 外部サービス・委託先",
    body: [
      "当サービスの提供にあたり、以下の外部サービスまたは委託先を利用する場合があります。",
    ],
    bullets: [
      "ホスティング: Vercel",
      "データベース: PostgreSQL",
      "認証: NextAuth",
      "メール送信: SMTPメール配信サービス",
      "任意表示: Google Maps、YouTube埋め込み",
    ],
  },
  {
    title: "7. 第三者提供",
    body: [
      "当サービスは、法令に基づく場合、本人の同意がある場合、またはサービス提供に必要な委託先へ必要な範囲で提供する場合を除き、取得した個人情報を第三者に提供しません。",
      "スクールが設定したフォーム送信内容は、当該スクールの管理者通知先、メール設定に基づく宛先、フォーム送信者への自動返信先に送信される場合があります。",
    ],
  },
  {
    title: "8. 安全管理",
    body: [
      "当サービスは、取得した情報について、アクセス権限の管理、認証、通信経路の保護、不要な情報へのアクセス制限など、適切な安全管理措置を講じるよう努めます。",
      "パスワードは平文では保存せず、ハッシュ化した状態で保存します。",
    ],
  },
  {
    title: "9. 保存期間",
    body: [
      "取得した情報は、サービス提供、契約管理、問い合わせ対応、運用改善に必要な期間保存し、不要になり次第削除または適切な方法で処理します。",
      "フォーム送信内容や利用ログについては、スクール運営者による確認、予約対応、運用改善、トラブル対応に必要な範囲で保存される場合があります。",
    ],
  },
  {
    title: "10. 開示・訂正・削除等の問い合わせ",
    body: [
      "当サービスが保有する個人情報について、開示、訂正、利用停止、削除等を希望される場合は、お問い合わせ先までご連絡ください。本人確認および関係するスクールとの確認を行ったうえで、法令に従い合理的な範囲で対応します。",
    ],
  },
  {
    title: "11. 改定",
    body: [
      "本ポリシーは、サービス内容の変更、法令の改正、運用上の必要に応じて改定する場合があります。重要な変更がある場合は、当サイト上での掲載その他適切な方法によりお知らせします。",
    ],
  },
  {
    title: "12. お問い合わせ先",
    body: [
      "本ポリシーおよび個人情報の取り扱いに関するお問い合わせは、以下のメールアドレスまでご連絡ください。",
    ],
    definitionList: [{ term: "メールアドレス", description: "rizbo@dansul.jp" }],
  },
];

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-5 text-sm sm:px-8 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_1.1fr]">
        <div>
          <img src="/logo.svg" alt="rizbo" width={94} height={30} className="h-7 w-auto" />
          <p className="mt-4 max-w-[260px] text-xs font-semibold leading-6 text-slate-500">
            問い合わせ対応を減らし、体験予約につながる流れを整える管理ツールです。
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-xs font-extrabold text-slate-950">{column.title}</h3>
            <div className="mt-4 space-y-3">
              {column.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noreferrer" : undefined}
                  className="block text-xs font-bold text-slate-500 hover:text-[#fe6147]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        ))}
        <div>
          <div className="rounded-xl border border-[#ffd7cf] bg-[#fff0ec] p-5">
            <p className="text-xs font-bold text-slate-600">ご不明な点はお気軽にご相談ください</p>
            <a href="mailto:rizbo@dansul.jp" className="mt-3 flex items-center gap-2 text-sm font-extrabold text-slate-950 hover:text-[#fe6147]">
              <Mail className="h-4 w-4 text-[#fe6147]" aria-hidden="true" />
              rizbo@dansul.jp
            </a>
          </div>
          <p className="mt-5 text-xs font-semibold text-slate-400">© 2025 rizbo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950 selection:bg-[#fe6147]/20">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center">
            <img src="/logo.svg" alt="rizbo" width={94} height={30} className="h-8 w-auto" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-extrabold text-slate-800 md:flex">
            <Link href="/features" className="hover:text-[#fe6147]">
              機能
            </Link>
            <Link href="/getting-started" className="hover:text-[#fe6147]">
              はじめ方
            </Link>
            <Link href="/reports" className="hover:text-[#fe6147]">
              運用レポート
            </Link>
          </nav>
          <Link
            href="/#cta"
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#fe6147] px-5 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(254,97,71,0.2)] transition hover:bg-[#e94f36]"
          >
            導入の相談
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section
        className="border-b border-pink-100 bg-[#fff8f7] px-5 py-14 sm:px-8"
        style={{ backgroundImage: SOFT_GRADIENT }}
      >
        <div className="mx-auto max-w-[1120px]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-[#fe6147] hover:text-[#e94f36]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            トップへ戻る
          </Link>
          <p className="mt-8 text-sm font-extrabold text-[#fe6147]">Privacy Policy</p>
          <h1 className="mt-3 max-w-[820px] text-[32px] font-extrabold leading-tight tracking-normal text-slate-950 sm:text-[48px]">
            <span className="inline-block">プライバシー</span>
            <span className="inline-block">ポリシー</span>
          </h1>
          <p className="mt-5 max-w-[820px] text-base font-semibold leading-8 text-slate-700">
            rizboのQ&Aチャットボット、相性診断、予約フォーム、管理画面、運用レポートで取り扱う情報と、その利用目的を定めます。
          </p>
          <p className="mt-5 text-sm font-bold text-slate-500">制定日: 2026年6月17日</p>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <nav className="sticky top-24 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-extrabold text-slate-950">目次</p>
              <ol className="mt-4 space-y-2 text-xs font-bold leading-5 text-slate-500">
                {sections.map((section) => (
                  <li key={section.title}>
                    <a href={`#${section.title.replace(/[^0-9]/g, "")}`} className="hover:text-[#fe6147]">
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-9">
            <div className="space-y-10">
              {sections.map((section) => (
                <section
                  id={section.title.replace(/[^0-9]/g, "")}
                  key={section.title}
                  className="scroll-mt-28 border-b border-slate-100 pb-10 last:border-b-0 last:pb-0"
                >
                  <h2 className="text-xl font-extrabold leading-8 text-slate-950">{section.title}</h2>
                  <div className="mt-4 space-y-4 text-sm font-semibold leading-8 text-slate-700">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  {section.definitionList ? (
                    <dl className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/60">
                      {section.definitionList.map((item) => (
                        <div key={item.term} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[150px_1fr]">
                          <dt className="font-extrabold text-slate-950">{item.term}</dt>
                          <dd className="font-semibold leading-7 text-slate-700">{item.description}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {section.bullets ? (
                    <ul className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3 text-sm font-semibold leading-7 text-slate-700">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#fe6147]" aria-hidden="true" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 rounded-xl border border-[#ffd7cf] bg-[#fff0ec] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">個人情報に関するお問い合わせ</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              開示、訂正、削除等のご相談は、内容を確認できる情報を添えてご連絡ください。
            </p>
          </div>
          <a
            href="mailto:rizbo@dansul.jp"
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-[#fe6147] px-6 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(254,97,71,0.2)] transition hover:bg-[#e94f36]"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            rizbo@dansul.jp
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
