import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// ✅ 型を明示することが重要！
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login", // 👈 カスタムログインページ
  },
  callbacks: {
    async session({ session }) {
      return session;
    },
  },
};

// NextAuth に正しいオプションを渡す
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
