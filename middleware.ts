// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // NextAuth の JWT を取得（ログイン状態かどうか）
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isLoginPage = pathname === "/login" || pathname === "/login/";

  const isProtectedRoute =
    ["/", "/faq", "/help"].includes(pathname) ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/superadmin");

  // ✅ ① ログイン済みで /login に来たらトップへリダイレクト
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // ✅ ② 未ログインで保護ページに来たら /login へリダイレクト
  if (!token && isProtectedRoute) {
    const loginUrl = new URL("/login", req.url);

    // 任意：元のURLに戻したい場合は callbackUrl を付与
    loginUrl.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search
    );

    return NextResponse.redirect(loginUrl);
  }

  // それ以外はそのまま通す
  return NextResponse.next();
}

// どのパスで middleware を走らせるか
export const config = {
  matcher: [
    "/", // トップ
    "/faq", // FAQ
    "/help", // ヘルプ
    "/admin/:path*", // /admin 以下
    "/superadmin/:path*", // /superadmin 以下
    "/login", // ログインページ自身
  ],
};
