"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarCheck } from "lucide-react";

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

  if (status === "loading" || loading) return <p className="p-6">読み込み中...</p>;
  return <div className="mx-auto max-w-6xl px-4 py-6">
    <h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarCheck className="h-6 w-6" />チャット体験予約</h1>
    <p className="mt-1 text-sm text-gray-600">チャット内で受け付けた体験予約のご希望です。通知連携は今後追加できます。</p>
    <div className="card mt-6 overflow-x-auto">
      {items.length === 0 ? <p className="p-6 text-sm text-gray-500">まだ予約希望はありません。</p> : <table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b text-left text-gray-500"><th className="p-3">受付日時</th><th className="p-3">お名前</th><th className="p-3">連絡先</th><th className="p-3">希望日時</th><th className="p-3">備考</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b align-top"><td className="p-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString("ja-JP")}</td><td className="p-3">{item.name}</td><td className="p-3">{item.email || item.phone}</td><td className="p-3">{item.preferredDate || "-"}</td><td className="p-3 whitespace-pre-wrap">{item.note || "-"}</td></tr>)}</tbody></table>}
    </div>
  </div>;
}
