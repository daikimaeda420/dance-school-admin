import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    // ✅ 認証をかけたいパスだけ明示する
    "/schools/:path*",
    "/superadmin/:path*",
    "/admin/:path*",
    "/api/check-admin",
    "/api/check-super-admin",
  ],
};
