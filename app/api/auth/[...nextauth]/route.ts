// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

const handler = NextAuth({
  ...authOptions,
  trustHost: true, // ← ここが絶対に必要！
});

export { handler as GET, handler as POST };
