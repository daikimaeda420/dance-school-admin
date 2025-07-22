"use client";

import { SessionProvider } from "next-auth/react";
import Header from "./Header";

export default function SessionProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
