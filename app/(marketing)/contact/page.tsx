import type { Metadata } from "next";
import { CheckCircle2, Mail } from "lucide-react";
import { LandingConsultationForm } from "@/components/marketing/LandingConsultationForm";
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
      showCta={false}
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
    >
      <section className="px-5 pb-12 sm:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-xl border border-[#ffd7cf] bg-[#fff0ec] p-6 shadow-[0_14px_34px_rgba(254,97,71,0.08)]">
            <h2 className="text-xl font-extrabold leading-8 text-slate-950">
              導入の相談・お問い合わせ
            </h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
              スクールの状況に合わせて、問い合わせ対応、診断、予約フォーム、運用レポートの使い方と導入手順を整理してご案内します。
            </p>
            <div className="mt-6 space-y-3">
              {[
                "今の問い合わせ対応を整理したい",
                "診断や予約フォームの設置方法を知りたい",
                "導入前に管理画面の使い方を確認したい",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm font-bold leading-6 text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#fe6147]" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-[#ffd7cf] bg-white/70 p-4">
              <p className="text-xs font-bold text-slate-600">メールで連絡したい場合</p>
              <a
                href="mailto:rizbo@dansul.jp"
                className="mt-3 flex items-center gap-2 text-sm font-extrabold text-slate-950 transition hover:text-[#fe6147]"
              >
                <Mail className="h-4 w-4 text-[#fe6147]" aria-hidden="true" />
                rizbo@dansul.jp
              </a>
            </div>
          </div>
          <LandingConsultationForm />
        </div>
      </section>
    </PublicInfoPage>
  );
}
