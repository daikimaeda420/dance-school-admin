// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions"; // 外部の authOptions をインポート

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; // handler のみ export（authOptions は export しない）
