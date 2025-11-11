// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // ✅ ログイン済みで /login に来た場合はトップへ
    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // それ以外はデフォルトの動作に任せる
    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
    callbacks: {
      authorized({ token }) {
        // token があればログイン扱い
        return !!token;
      },
    },
  }
);

// ✅ ログイン必須にしたいパスを指定
export const config = {
  matcher: [
    "/",
    "/faq",
    "/help",
    "/admin/:path*",
    "/superadmin/:path*",
    "/login", // ← これを追加することで /login にも middleware が反応
  ],
};
