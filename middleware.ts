import { withAuth } from "next-auth/middleware";
import { NextRequest } from "next/server";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token }) => {
      console.log("🔍 middleware token:", token);
      return !!token?.email;
    },
  },
});

export const config = {
  matcher: [
    "/schools/:path*",
    "/superadmin/:path*",
    "/admin/:path*",
    // ここには `/` や `/after-login`、`/login` は書かないこと！
  ],
};
