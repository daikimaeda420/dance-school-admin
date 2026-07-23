"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarCheck, LoaderCircle, Mail, Phone, Users } from "lucide-react";

type Reservation = { id: string; name: string; email: string | null; phone: string | null; preferredDate: string | null; note: string | null; status: string; createdAt: string };

export default function ChatReservationsPage() {
  const { data: session, status } = useSession();
  const schoolId = (session?.user as { schoolId?: string } | undefined)?.schoolId;
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;
    fetch(`/api/admin/chat-reservations?schoolId=${encodeURIComponent(schoolId)}`, { cache: "no-store" })
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => setItems(Array.isArray(data.reservations) ? data.reservations : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [schoolId]);

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-[1540px] px-4 py-6 text-slate-800 md:px-6">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><CalendarCheck className="h-6 w-6 text-[#fe6147]" />チャット予約</h1>
          <p className="mt-1 text-sm text-slate-500">チャット内で受け付けた体験予約のご希望を一覧で管理できます。</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          読み込み中…
        </div>
      </div>
    );
  }
  return <div className="mx-auto max-w-[1540px] px-4 py-6 text-slate-800 md:px-6">
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><CalendarCheck className="h-6 w-6 text-[#fe6147]" />チャット予約</h1><p className="mt-1 text-sm text-slate-500">チャット内で受け付けた体験予約のご希望を一覧で管理できます。</p></div><div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><span className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Users className="h-4 w-4 text-blue-600" />予約希望</span><strong className="mt-1 block text-2xl text-slate-900">{items.length}件</strong></div></div>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      {items.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">まだ予約希望はありません。チャット予約を有効にすると、ここで受付状況を確認できます。</div> : <table className="w-full min-w-[720px] text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500"><tr><th className="p-4">受付日時</th><th className="p-4">お名前</th><th className="p-4">連絡先</th><th className="p-4">希望日時</th><th className="p-4">備考</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-slate-100 align-top transition hover:bg-slate-50"><td className="whitespace-nowrap p-4 text-slate-500">{new Date(item.createdAt).toLocaleString("ja-JP")}</td><td className="p-4 font-semibold text-slate-800">{item.name}</td><td className="p-4 text-slate-600"><div className="space-y-1">{item.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-blue-500" />{item.email}</span>}{item.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-blue-500" />{item.phone}</span>}</div></td><td className="p-4 text-slate-600">{item.preferredDate || "-"}</td><td className="whitespace-pre-wrap p-4 text-slate-600">{item.note || "-"}</td></tr>)}</tbody></table>}
    </div>
  </div>;
}
