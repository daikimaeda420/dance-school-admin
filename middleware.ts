// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token }) => !!token, // ← 追加
  },
});

export const config = {
  matcher: ["/schools/:path*", "/superadmin/:path*", "/admin/:path*"],
};
