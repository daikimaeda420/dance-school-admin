// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

const handler = NextAuth({
  ...authOptions,
  trustHost: true, // ✅ ここを追加！
});

export { handler as GET, handler as POST };
