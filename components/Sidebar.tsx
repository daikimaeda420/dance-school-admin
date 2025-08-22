// components/Sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Layers,
  ClipboardList,
  Users,
  Settings,
  HelpCircle,
} from "lucide-react";

const NAV = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/schools/manage", label: "学校管理", icon: ClipboardList },
  { href: "/faq", label: "Q&A編集", icon: Layers },
  { href: "/admin/chat-history", label: "ユーザーログ", icon: Users },
  { href: "/superadmin", label: "アカウント管理", icon: Settings },
  { href: "/help", label: "ヘルプ", icon: HelpCircle },
];

export default function Sidebar() {
  const pathname = usePathname();

  // /embed 配下では非表示（必要なら）
  if (pathname.startsWith("/embed")) return null;

  return (
    <aside className="hidden md:block w-64 shrink-0 border-r border-gray-200 bg-white/90 backdrop-blur">
      <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
        <div className="text-xs text-gray-500 px-3 pb-2">メニュー</div>
        <nav className="space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active =
              pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100",
                  active
                    ? "bg-amber-50 text-amber-700 border-l-4 border-amber-400"
                    : "",
                ].join(" ")}
              >
                <Icon size={18} />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
