import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // NextAuth の JWT を取得（ログイン状態かどうか）
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isLoginPage = pathname === "/login" || pathname === "/login/";

  // 管理系のみ保護（トップ "/" は含めない）
  const isProtectedRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/superadmin") ||
    pathname === "/faq" ||
    pathname === "/help";

  // ログイン済みで /login に来たらトップ（LP or Dashboard判定は page.tsx 側）
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 未ログインで管理系に来たら /login
  if (!token && isProtectedRoute) {
    const loginUrl = new URL("/login", req.url);

    // 元のURLに戻したい場合
    loginUrl.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search,
    );

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/faq",
    "/help",
    "/admin/:path*",
    "/superadmin/:path*",
    "/login",
  ],
};
