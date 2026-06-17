"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Mail } from "lucide-react";

type SubmitState = "idle" | "submitting" | "success" | "error";

type LandingConsultationFormProps = {
  className?: string;
};

export function LandingConsultationForm({ className }: LandingConsultationFormProps) {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitState("submitting");
    setSubmitMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: formData.get("schoolName"),
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          message: formData.get("message"),
          website: formData.get("website"),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message ?? "送信に失敗しました。");
      }

      form.reset();
      setSubmitState("success");
      setSubmitMessage("送信しました。内容を確認のうえ、担当よりご連絡します。");
    } catch (error) {
      setSubmitState("error");
      setSubmitMessage(
        error instanceof Error
          ? error.message
          : "送信に失敗しました。時間をおいて再度お試しください。",
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={[
        "relative rounded-xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-extrabold text-slate-700">スクール名</span>
          <input
            name="schoolName"
            required
            autoComplete="organization"
            className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#fe6147] focus:ring-4 focus:ring-[#fe6147]/10"
            placeholder="例）Rizbo Dance Studio"
          />
        </label>
        <label className="block">
          <span className="text-xs font-extrabold text-slate-700">お名前</span>
          <input
            name="name"
            required
            autoComplete="name"
            className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#fe6147] focus:ring-4 focus:ring-[#fe6147]/10"
            placeholder="例）山田 太郎"
          />
        </label>
        <label className="block">
          <span className="text-xs font-extrabold text-slate-700">メールアドレス</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#fe6147] focus:ring-4 focus:ring-[#fe6147]/10"
            placeholder="example@school.jp"
          />
        </label>
        <label className="block">
          <span className="text-xs font-extrabold text-slate-700">電話番号</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#fe6147] focus:ring-4 focus:ring-[#fe6147]/10"
            placeholder="任意"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-extrabold text-slate-700">相談内容</span>
        <textarea
          name="message"
          rows={5}
          className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#fe6147] focus:ring-4 focus:ring-[#fe6147]/10"
          placeholder="導入時期、現在の課題、確認したいことなど"
        />
      </label>

      <label className="sr-only" aria-hidden="true">
        Web site
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={submitState === "submitting"}
          className="inline-flex min-h-[50px] w-full items-center justify-center gap-3 rounded-lg bg-[#fe6147] px-8 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(254,97,71,0.22)] transition hover:bg-[#e94f36] disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit"
        >
          {submitState === "submitting" ? "送信中..." : "相談内容を送信"}
          <Mail className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <p
        className={[
          "mt-4 min-h-[20px] text-xs font-bold",
          submitState === "success"
            ? "text-emerald-600"
            : submitState === "error"
              ? "text-[#fe6147]"
              : "text-slate-400",
        ].join(" ")}
        aria-live="polite"
      >
        {submitMessage || "送信内容は導入相談の連絡にのみ使用します。"}
      </p>
    </form>
  );
}
