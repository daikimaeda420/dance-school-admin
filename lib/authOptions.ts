import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import users from "@/data/users.json"; // ← 必ず絶対パスで読み込む

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "ユーザー名", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        const { username, password } = credentials ?? {};
        if (!username || !password) return null;

        // users.json から該当ユーザーを検索
        const user = users.find(
          (u) => u.email.toLowerCase() === username.toLowerCase()
        );

        if (!user) return null;

        // パスワード照合
        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        // ログイン成功時のセッションデータ
        return {
          id: user.email,
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
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.schoolId = user.schoolId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.schoolId = token.schoolId ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
