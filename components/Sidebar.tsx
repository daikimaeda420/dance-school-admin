"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bot, CalendarCheck, ChevronDown, ClipboardCheck, ClipboardList, Compass, ExternalLink, HelpCircle, Home, ListChecks, MessagesSquare, Settings, Sparkles, TimerReset, TrendingUp, UserCog, X } from "lucide-react";
import { MouseEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Props = { showDesktop?: boolean; mobileOpen?: boolean; onClose?: () => void };
type Item = { href: string; label: string; icon: typeof Home; superOnly?: boolean };
type Group = { label?: string; icon?: typeof Home; items: Item[] };

export default function Sidebar({ showDesktop = true, mobileOpen = false, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const { data: session } = useSession();
  const schoolId = (session?.user as { schoolId?: string } | undefined)?.schoolId;
  const role = String((session?.user as { role?: string } | undefined)?.role ?? "");
  const isSuperAdmin = role.toLowerCase() === "superadmin" || role === "SUPERADMIN";
  if (pathname.startsWith("/embed")) return null;

  const withSchool = (path: string) => schoolId ? `${path}${path.includes("?") ? "&" : "?"}schoolId=${encodeURIComponent(schoolId)}` : path;
  const reportQa = withSchool("/admin/reports/qa");
  const reportDiagnosis = withSchool("/admin/reports/diagnosis");
  const diagnosisEdit = withSchool("/admin/diagnosis/campuses");
  const qaChecklist = withSchool("/admin/qa/checklist");
  const setupGuide = withSchool("/admin/setup-guide");
  const chatbotPreview = `/embed/chatbot${schoolId ? `?school=${encodeURIComponent(schoolId)}` : ""}`;
  const diagnosisPreview = `https://rizbo.dansul.jp/embed/diagnosis${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ""}`;
  const isActive = (href: string) => pathname === href.split("?")[0] || pathname.startsWith(`${href.split("?")[0]}/`);

  useEffect(() => {
    // 分析ページの画面枠を先読みし、メニューをクリックしてからの遷移待ちを減らす。
    ["/", "/admin/monthly-kpi", "/admin/ai-insights", reportDiagnosis, reportQa].forEach((href) => router.prefetch(href));
  }, [reportDiagnosis, reportQa, router]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  useEffect(() => {
    setNavigating(false);
  }, [pathname]);

  const openPreview = (event?: MouseEvent<HTMLButtonElement>) => {
    if (event?.metaKey || event?.ctrlKey || event?.shiftKey) { window.open(chatbotPreview, "_blank", "noopener,noreferrer"); return; }
    const popup = window.open(chatbotPreview, "rizboChatPreview", "popup=yes,width=420,height=720,resizable=yes,scrollbars=yes");
    if (!popup) window.open(chatbotPreview, "_blank", "noopener,noreferrer");
    else popup.focus();
  };

  const groups: Group[] = [
    { items: [{ href: "/", label: "ホーム", icon: Home }] },
    { label: "分析・改善", icon: BarChart3, items: [{ href: "/admin/monthly-kpi", label: "月次KPI・売上シミュレーション", icon: TrendingUp }, { href: "/admin/ai-insights", label: "AIコンサル・分析", icon: Sparkles }, { href: reportDiagnosis, label: "相性診断レポート", icon: ClipboardList }, { href: reportQa, label: "Q&Aレポート", icon: BarChart3 }] },
    { label: "コンテンツ設定", icon: MessagesSquare, items: [{ href: setupGuide, label: "設定ガイド", icon: Compass }, { href: "/faq", label: "Q&A編集", icon: MessagesSquare }, { href: qaChecklist, label: "Q&A完成度", icon: ClipboardCheck }, { href: diagnosisEdit, label: "診断編集", icon: ListChecks }] },
    { label: "運用", icon: TimerReset, items: [{ href: "/admin/chat-history", label: "ユーザーログ", icon: TimerReset }, { href: "/admin/chat-reservations", label: "チャット予約", icon: CalendarCheck }] },
    { label: "管理", icon: Settings, items: [{ href: "/superadmin", label: "アカウント管理", icon: UserCog }, { href: "/admin/system", label: "システム設定", icon: Settings, superOnly: true }, { href: "/help", label: "ヘルプ", icon: HelpCircle }] },
  ];

  const activeGroup = groups.find((group) => group.label && group.items.some((item) => (!item.superOnly || isSuperAdmin) && isActive(item.href)))?.label ?? null;

  useEffect(() => {
    if (activeGroup) setOpenGroup(activeGroup);
  }, [activeGroup]);

  const nav = (mobile = false) => <nav className={mobile ? "space-y-5 p-3" : "flex h-full flex-col p-3"}>
    <div className="space-y-3">{groups.map((group, index) => {
      const items = group.items.filter((item) => !item.superOnly || isSuperAdmin);
      const expanded = Boolean(group.label && openGroup === group.label);
      const groupIsActive = Boolean(group.label && activeGroup === group.label);
      const GroupIcon = group.icon;

      return <section key={group.label ?? index}>
        {group.label ? <button type="button" onClick={() => setOpenGroup(expanded ? null : group.label!)} aria-expanded={expanded} className={`flex min-h-10 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${expanded ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}><span className="flex items-center gap-2.5">{GroupIcon && <span className={`grid h-6 w-6 place-items-center rounded-md ${groupIsActive ? "bg-[#fff0ed] text-[#fe6147]" : "bg-slate-100 text-slate-400"}`}><GroupIcon size={14} strokeWidth={2.1} /></span>}<span>{group.label}</span></span><span className={`grid h-6 w-6 place-items-center rounded-full ${expanded ? "bg-white text-slate-600 shadow-sm" : "text-slate-400"}`}><ChevronDown size={15} className={`transition-transform ${expanded ? "rotate-180" : ""}`} /></span></button> : null}
        {(!group.label || expanded) && <div className={group.label ? "relative ml-6 mt-1.5 space-y-1 border-l-2 border-slate-100 py-1 pl-2.5" : "space-y-1"}>{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onMouseEnter={() => router.prefetch(href)} onFocus={() => router.prefetch(href)} onClick={() => { setNavigating(true); mobile && onClose?.(); }} aria-current={isActive(href) ? "page" : undefined} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive(href) ? "bg-[#fff0ed] text-[#dd4d36] shadow-[inset_3px_0_0_#fe6147]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}><Icon size={18} className={isActive(href) ? "text-[#fe6147]" : "text-slate-400 group-hover:text-[#2563eb]"} /><span>{label}</span></Link>)}</div>}
      </section>;
    })}</div>
    {!mobile && <div className="mt-auto space-y-1 border-t border-slate-100 pt-3"><button type="button" onClick={openPreview} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"><span className="flex items-center gap-3"><Bot size={18} className="text-[#2563eb]" />チャットプレビュー</span><ExternalLink size={14} /></button><a href={diagnosisPreview} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"><span className="flex items-center gap-3"><ClipboardList size={18} className="text-[#2563eb]" />診断プレビュー</span><ExternalLink size={14} /></a></div>}
  </nav>;

  return <>{navigating && <div className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-orange-100"><div className="h-full w-1/2 animate-pulse rounded-full bg-[#fe6147]" /></div>}{showDesktop && <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white md:block">{nav()}</aside>}{mobileOpen && <div className="fixed inset-0 z-[60] md:hidden"><button aria-label="メニューを閉じる" onClick={onClose} className="absolute inset-0 bg-slate-900/30" /><aside role="dialog" aria-modal="true" className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-4"><p className="font-bold text-slate-800">メニュー</p><button type="button" aria-label="閉じる" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>{nav(true)}<div className="space-y-1 border-t border-slate-100 p-3"><button type="button" onClick={(e) => { openPreview(e); onClose?.(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600"><Bot size={18} className="text-[#2563eb]" />チャットプレビュー</button><a href={diagnosisPreview} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600"><ClipboardList size={18} className="text-[#2563eb]" />診断プレビュー</a></div></aside></div>}</>;
}
