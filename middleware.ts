// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ token, req }) {
      console.log(
        "[middleware]",
        "checking auth - path=",
        req.nextUrl.pathname
      );
      console.log("[middleware]", "token=", token);
      // token があればログイン扱い
      return !!token;
    },
  },
});

// ここで「ログイン必須」にしたいパスを指定
export const config = {
  matcher: [
    "/", // トップ
    "/faq", // FAQ
    "/help", // ヘルプ
    "/admin/:path*", // 例: /admin/chat-history など全部
    "/superadmin/:path*", // 例: /superadmin や配下
    // 必要なら "/after-login" も足せる
  ],
};
