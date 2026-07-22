import { UserCog } from "lucide-react";
import UsersEditor from "@/components/UsersEditor";
import SuperAdminEditor from "./SuperAdminEditor";

export default function SuperadminPage() {
  return (
    <div className="mx-auto max-w-[1540px] px-4 py-6 text-slate-800 md:px-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <UserCog aria-hidden="true" className="h-6 w-6 text-[#fe6147]" />
          <span>アカウント管理</span>
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          アカウント・権限の設定と、ユーザー管理を行います。
        </p>
      </div>

      {/* Super Admin 管理 */}
      <section className="mb-4 sm:mb-6">
        <SuperAdminEditor />
      </section>

      {/* ユーザー管理 */}
      <section className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
            スクールユーザー管理
          </h2>
        </div>
        <div className="card-body p-3 sm:p-6">
          <UsersEditor />
        </div>
      </section>
    </div>
  );
}
