import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Compass,
  ExternalLink,
  FormInput,
  ListChecks,
  MessagesSquare,
  MonitorCheck,
} from "lucide-react";
import { getAccessiblePageSchoolId } from "@/lib/authz";

export const dynamic = "force-dynamic";

type Step = {
  title: string;
  description: string;
  detail: string;
  href: string;
  action: string;
  icon: typeof MessagesSquare;
  external?: boolean;
  secondary?: { href: string; label: string; external?: boolean };
};

function withSchool(path: string, schoolId: string) {
  if (!schoolId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}schoolId=${encodeURIComponent(schoolId)}`;
}

function SetupStep({ step, index }: { step: Step; index: number }) {
  const Icon = step.icon;
  const actionClass =
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#fe6147] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#eb4f35] focus:outline-none focus:ring-2 focus:ring-orange-200";

  const action = step.external ? (
    <a href={step.href} target="_blank" rel="noopener noreferrer" className={actionClass}>
      {step.action}
      <ExternalLink className="h-4 w-4" aria-hidden />
    </a>
  ) : (
    <Link href={step.href} className={actionClass}>
      {step.action}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );

  return (
    <li className="relative grid gap-4 border-b border-slate-100 py-5 last:border-b-0 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
      <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-sm font-bold text-[#dd4d36]">
        {index}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <Icon className="h-5 w-5 text-[#fe6147]" aria-hidden />
          <h2 className="text-base font-bold text-slate-900">{step.title}</h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">{step.detail}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {action}
        {step.secondary && (step.secondary.external ? (
          <a href={step.secondary.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
            {step.secondary.label}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : (
          <Link href={step.secondary.href} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
            {step.secondary.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ))}
      </div>
    </li>
  );
}

export default async function SetupGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; school?: string }>;
}) {
  const sp = await searchParams;
  const schoolId = await getAccessiblePageSchoolId(sp.schoolId ?? sp.school);
  const chatbotPreview = `/embed/chatbot${schoolId ? `?school=${encodeURIComponent(schoolId)}` : ""}`;
  const diagnosisPreview = `https://rizbo.dansul.jp/embed/diagnosis${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ""}`;

  const steps: Step[] = [
    {
      title: "Q&Aを整える",
      description: "よくある質問と回答を登録し、利用者の不安を先回りして解消します。",
      detail: "料金・体験・初心者・アクセス・予約に関する質問から始めるとスムーズです。",
      href: "/faq",
      action: "Q&Aを編集する",
      icon: MessagesSquare,
    },
    {
      title: "Q&Aの完成度を確認する",
      description: "回答漏れや公開設定、申込導線をチェックします。",
      detail: "「要確認」「未設定」がなくなるまで、表示された項目を順に整えてください。",
      href: withSchool("/admin/qa/checklist", schoolId),
      action: "完成度を確認する",
      icon: ClipboardCheck,
    },
    {
      title: "診断コンテンツを設定する",
      description: "校舎・コース・ジャンル・講師・スケジュールを登録し、診断結果の提案内容を整えます。",
      detail: "まずは校舎とコースを設定し、画面上部のメニューで必要な項目を追加してください。",
      href: withSchool("/admin/diagnosis/campuses", schoolId),
      action: "診断を編集する",
      icon: ListChecks,
    },
    {
      title: "予約フォームを設定する",
      description: "体験予約に必要な入力項目と送信先メールアドレスを確認します。",
      detail: "入力負担を増やしすぎないよう、必須項目は必要最小限にするのがおすすめです。",
      href: withSchool("/admin/diagnosis/form", schoolId),
      action: "フォームを設定する",
      icon: FormInput,
    },
    {
      title: "プレビューで体験する",
      description: "利用者の目線で、Q&Aと相性診断から予約までの流れを確認します。",
      detail: "スマートフォンでも確認し、質問・表示順・フォーム入力に迷いがないかを見てください。",
      href: chatbotPreview,
      action: "Q&Aを確認する",
      icon: MonitorCheck,
      external: true,
      secondary: { href: diagnosisPreview, label: "診断を確認する", external: true },
    },
    {
      title: "サイトに設置して公開する",
      description: "ホーム画面の設置コードをコピーし、スクールサイトのHTMLに追加します。",
      detail: "公開後は、設置サイトUU・診断完了率・体験予約率をホームとレポートで確認できます。",
      href: "/",
      action: "設置コードを開く",
      icon: Code2,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1540px] px-4 py-6 md:px-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
          <Compass className="h-6 w-6 text-[#fe6147]" aria-hidden />
          設定ガイド
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          はじめて設定する方も、上から順に進めるだけで公開まで完了できます。
        </p>
      </header>

      <section className="mb-5 overflow-hidden rounded-xl border border-orange-200 bg-[#fffaf7]">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-white p-2 text-[#fe6147] shadow-sm">
              <BookOpenCheck className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">公開までの6ステップ</p>
              <p className="mt-1 text-sm text-slate-600">編集後は必ず保存し、プレビューで利用者の見え方を確認してください。</p>
            </div>
          </div>
          <a href="/guides/rizbo-school-setup-guide.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#c7432f] transition hover:bg-orange-50">
            配布用ガイド（PDF）
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white px-5 shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <ol className="relative before:absolute before:bottom-9 before:left-[1.125rem] before:top-9 before:border-l before:border-dashed before:border-orange-200">
          {steps.map((step, index) => <SetupStep key={step.title} step={step} index={index + 1} />)}
        </ol>
      </section>

      <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#2563eb]" aria-hidden />
          <div>
            <p className="text-sm font-bold text-slate-900">公開後も月に一度、成果を振り返りましょう</p>
            <p className="mt-1 text-sm text-slate-600">AIコンサル・分析では、離脱ポイント・需要の変化・改善案を確認できます。</p>
          </div>
        </div>
        <Link href="/admin/ai-insights" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
          AIコンサル・分析を開く
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </main>
  );
}
