import { withAuth } from "next-auth/middleware";
import { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest) {
    // `/after-login` と `/login` には middleware を適用しない
    const { pathname } = req.nextUrl;
    if (pathname.startsWith("/after-login") || pathname.startsWith("/login")) {
      return;
    }
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
