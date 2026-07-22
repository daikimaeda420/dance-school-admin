// app/(app)/admin/diagnosis/_components/adminStyles.ts
// 管理画面の統一UIスタイル定数

export const adminCard =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)]";

export const adminInput =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:border-[#fe6147] focus:ring-2 focus:ring-orange-100 disabled:opacity-50";

export const adminTextarea =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:border-[#fe6147] focus:ring-2 focus:ring-orange-100 disabled:opacity-50 " +
  "min-h-[80px] resize-y";

export const adminSelect =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 " +
  "focus:outline-none focus:border-[#fe6147] focus:ring-2 focus:ring-orange-100 disabled:opacity-50";

export const adminLabel = "text-xs font-semibold text-slate-600";

export const adminBtn =
  "rounded-lg px-3 py-2 text-sm font-semibold border transition " +
  "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-[#c53f2b] disabled:opacity-50";

export const adminBtnPrimary =
  "rounded-lg px-4 py-2 text-sm font-semibold text-white " +
  "bg-[#fe6147] hover:bg-[#eb4f35] disabled:opacity-50";

export const adminBtnDanger =
  "rounded-lg px-3 py-2 text-sm font-semibold border " +
  "border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50";
