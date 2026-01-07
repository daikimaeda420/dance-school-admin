// app/admin/diagnosis/layout.tsx
import type { ReactNode } from "react";
import { Suspense } from "react";
import DiagnosisAdminNav from "./_components/DiagnosisAdminNav";

export default function DiagnosisAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full p-6 text-gray-900">
      <Suspense fallback={null}>
        <DiagnosisAdminNav />
        {children}
      </Suspense>
    </div>
  );
}
