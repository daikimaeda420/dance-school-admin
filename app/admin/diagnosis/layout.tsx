import type { ReactNode } from "react";
import DiagnosisAdminNav from "./_components/DiagnosisAdminNav";

export default function DiagnosisAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl p-6 text-gray-900">
      <DiagnosisAdminNav />
      {children}
    </div>
  );
}
