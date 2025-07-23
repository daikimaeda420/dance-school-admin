// app/login/page.tsx
"use client";

import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <LoginForm />
    </Suspense>
  );
}
