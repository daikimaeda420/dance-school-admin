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

  // 🔒 管理系のみ保護（トップ "/" は含めない）
  const isProtectedRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/superadmin") ||
    pathname === "/faq" ||
    pathname === "/help";

  // ✅ ① ログイン済みで /login に来たらトップ（LP or Dashboard判定は page.tsx 側）
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // ✅ ② 未ログインで管理系に来たら /login
  if (!token && isProtectedRoute) {
    const loginUrl = new URL("/login", req.url);

    // 任意：元のURLに戻したい場合
    loginUrl.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search
    );

    return NextResponse.redirect(loginUrl);
  }

  // それ以外はそのまま通す
  return NextResponse.next();
}

// middleware を動かすパス
export const config = {
  matcher: [
    "/", // ← ここは通すだけ（LP表示）
    "/faq",
    "/help",
    "/admin/:path*",
    "/superadmin/:path*",
    "/login",
  ],
};
