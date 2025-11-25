// lib/authOptions.ts

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

type CustomUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId: string;
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        // 両方定義しておいてどちらでも受け取れるようにする
        email: { label: "メールアドレス", type: "text" },
        username: { label: "メールアドレス", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials): Promise<CustomUser | null> {
        // フォーム側が email でも username でも取れるようにする
        const rawId =
          credentials?.email?.toString() || credentials?.username?.toString();
        const password = credentials?.password?.toString() ?? "";

        if (!rawId || !password) return null;

        const email = rawId.toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as any).role;
        token.schoolId = (user as any).schoolId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).schoolId = token.schoolId;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
