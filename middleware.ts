// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // ✅ ログイン済みで /login に来た場合はトップへリダイレクト
    if (pathname === "/login" && token) {
      const url = new URL("/", req.url);
      return NextResponse.redirect(url);
    }

    // 通常通り進行
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login", // 未ログイン時のリダイレクト先
    },
    callbacks: {
      authorized({ token }) {
        // token があれば認証済み
        return !!token;
      },
    },
  }
);

// ✅ middleware を適用するパスを指定
export const config = {
  matcher: [
    "/",
    "/faq",
    "/help",
    "/admin/:path*",
    "/superadmin/:path*",
    "/login", // ← これが重要（これがないと/login では走らない）
  ],
};
