import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import path from "path";
import { readFile } from "fs/promises";

// 🔧 独自User型（NextAuthのUserに必要な型を明示）
type CustomUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  schoolId: string | null;
  passwordHash?: string;
};

const USERS_PATH = path.join(process.cwd(), "data", "users.json");

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "メールアドレス", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials): Promise<CustomUser | null> {
        const { username, password } = credentials ?? {};
        if (!username || !password) return null;

        const raw = await readFile(USERS_PATH, "utf8");
        const users: CustomUser[] = JSON.parse(raw);

        const user = users.find(
          (u) => u.email.toLowerCase() === username.toLowerCase()
        );
        if (!user) return null;

        const isValid = await compare(password, user.passwordHash || "");
        if (!isValid) return null;

        return {
          id: user.email, // 👈 emailをidとして使用
          name: user.name,
          email: user.email,
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
        token.name = user.name;
        token.email = user.email;
        token.role = (user as any).role;
        token.schoolId = (user as any).schoolId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        (session.user as any).role = token.role;
        (session.user as any).schoolId = token.schoolId;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
