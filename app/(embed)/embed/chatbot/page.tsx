// app/(embed)/embed/layout.tsx
import type { ReactNode } from "react";

// もし埋め込みページ用のグローバルCSSを足すなら、クライアント子で styled-jsx
// import EmbedGlobalStyle from "@/components/EmbedGlobalStyle";

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* <EmbedGlobalStyle /> */}
      {children}
    </>
  );
}
