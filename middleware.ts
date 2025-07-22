import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token }) => {
      return !!token?.email;
    },
  },
});

export const config = {
  matcher: ["/schools/:path*", "/superadmin/:path*", "/admin/:path*"],
};
