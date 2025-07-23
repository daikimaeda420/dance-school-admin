// middleware.ts
// import { withAuth } from "next-auth/middleware";

// export default withAuth({
//   pages: { signIn: "/login" },
//   callbacks: {
//     authorized({ token, req }) {
//       console.log(
//         "[middleware]",
//         "checking auth - path=",
//         req.nextUrl.pathname
//       );
//       console.log("[middleware]", "token=", token);
//       return !!token;
//     },
//   },
// });

// export const config = {
//   matcher: [
//     "/after-login",
//     "/schools/:path*",
//     "/superadmin/:path*",
//     "/admin/:path*",
//   ],
// };
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ token, req }) {
      if (!token) {
        req.headers.set("x-token-status", "no-token");
        return false;
      }
      return true;
    },
  },
});
