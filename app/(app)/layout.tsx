// app/(app)/layout.tsx
import AuthProvider from "@/components/AuthProvider";
import LayoutShell from "@/components/LayoutShell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <AuthProvider session={session}>
      <LayoutShell>{children}</LayoutShell>
    </AuthProvider>
  );
}
