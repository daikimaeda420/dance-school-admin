// app/lib/authOptions.ts
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
        const user = users.find(
          (u) => u.email.toLowerCase() === credentials.username.toLowerCase()
        );

        if (!user) throw new Error("ユーザーが見つかりません");

        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) throw new Error("パスワードが違います");

        return {
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
        session.user.role = token.role;
        session.user.schoolId = token.schoolId ?? null;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.schoolId = user.schoolId ?? null;
      }
      return token;
    },
  },
};
