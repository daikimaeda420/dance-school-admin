// app/(app)/layout.tsx
import RootShell from "../RootShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <RootShell>{children}</RootShell>;
}
