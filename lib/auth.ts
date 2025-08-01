// app/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import users from "@/data/users.json"; // users.json を読み込む

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "ユーザー名", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = users.find(
          (u) => u.email.toLowerCase() === credentials.username.toLowerCase()
        );

        if (!user) throw new Error("ユーザーが見つかりません");

        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) throw new Error("パスワードが違います");

        // ✅ id を含めることで NextAuth の要件を満たす
        return {
          id: user.email, // ← ここが重要
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId ?? null,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string;
        session.user.schoolId = token.schoolId as string | null;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.schoolId = (user as any).schoolId ?? null;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
