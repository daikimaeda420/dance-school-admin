import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login", // ログインページへ明示的に飛ばす
  },
  callbacks: {
    authorized: ({ token }) => {
      // token が存在すればログイン済みとみなす（email が無くてもOK）
      return !!token;
    },
  },
});

export const config = {
  matcher: ["/schools/:path*", "/superadmin/:path*", "/admin/:path*"],
};
