// app/(with-header)/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Header from "@/components/Header";

export default async function WithHeaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions); // ✅ 修正！

  return (
    <>
      <Header />
      {children}
    </>
  );
}
