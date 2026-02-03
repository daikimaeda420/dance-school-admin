// app/(app)/layout.tsx
import AuthProvider from "@/components/AuthProvider";
import LayoutShell from "@/components/LayoutShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutShell>{children}</LayoutShell>
    </AuthProvider>
  );
}
