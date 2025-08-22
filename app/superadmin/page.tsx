// app/superadmin/page.tsx
import UsersEditor from "@/components/UsersEditor";

export default function SuperadminPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🛠 Super Admin</h1>
        <p className="mt-1 text-sm text-gray-600">
          アカウント・権限の設定と、ユーザー管理を行います。
        </p>
      </div>

      {/* ユーザー管理 */}
      <section className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">ユーザー管理</h2>
        </div>
        <div className="card-body">
          <UsersEditor />
        </div>
      </section>
    </main>
  );
}
