import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    "/schools/:path*",
    "/superadmin/:path*",
    "/admin/:path*",
    "/api/check-admin",
    "/api/check-super-admin",
    "!/after-login", // ← 明示的に除外！
    "!/login",
  ],
};
