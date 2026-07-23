import { LoaderCircle } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="mx-auto max-w-[1540px] px-4 py-6 md:px-6">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
        <LoaderCircle className="h-4 w-4 animate-spin text-[#fe6147]" aria-hidden />
        ページを読み込んでいます…
      </div>
    </div>
  );
}
