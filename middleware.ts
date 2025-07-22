import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login", // 未認証なら login ページへ
  },
  callbacks: {
    authorized: ({ token }) => {
      // token が存在すれば認証済みとみなす
      return !!token;
    },
  },
});

export const config = {
  matcher: ["/schools/:path*", "/superadmin/:path*", "/admin/:path*"],
};
