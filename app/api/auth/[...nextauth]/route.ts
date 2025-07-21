// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// ✅ このようにすることで、Vercel 環境でも正しく機能する
export const trustHost = true;
