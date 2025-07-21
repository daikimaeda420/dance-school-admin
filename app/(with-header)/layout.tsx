// app/(with-header)/layout.tsx
"use client";

import Header from "@/components/Header";
import { SessionProvider } from "next-auth/react";

export default function WithHeaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <Header />
      {children}
    </SessionProvider>
  );
}
