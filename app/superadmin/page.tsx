// app/superadmin/page.tsx
import dynamic from "next/dynamic";
import { UserCog } from "lucide-react";

const UsersEditor = dynamic(() => import("@/components/UsersEditor"), {
  ssr: false,
});
const SuperAdminEditor = dynamic(() => import("./SuperAdminEditor"), {
  ssr: false,
});

export default function SuperadminPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
          <UserCog aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
          <span>アカウント管理</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
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
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
            ユーザー管理
          </h2>
        </div>
        <div className="card-body p-3 sm:p-6">
          <UsersEditor />
        </div>
      </section>
    </div>
  );
}
