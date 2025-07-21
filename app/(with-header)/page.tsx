"use client";

import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import Chatbot from "@/components/Chatbot";

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter(); // ✅ 追加！

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "1rem",
      }}
    >
      <Chatbot schoolId="dansul" />
      <div style={{ maxWidth: "500px", width: "100%", textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>
          🕺 ダンススクール 管理システム
        </h1>
        {session ? (
          <div style={{ marginTop: "2rem" }}>
            <p style={{ fontSize: "1.1rem" }}>
              こんにちは、{session.user?.name} さん！
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                marginTop: "1.5rem",
              }}
            >
              <button
                onClick={() => router.push("/schools/manage")}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                学校一覧を見る
              </button>

              <button
                onClick={() => signOut()}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#6b7280",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                ログアウト
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: "2rem" }}>
            <p style={{ marginBottom: "1rem" }}>
              ログインして管理をはじめましょう
            </p>
            <button
              onClick={() => signIn("google", { callbackUrl: "/after-login" })}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Googleでログイン
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
