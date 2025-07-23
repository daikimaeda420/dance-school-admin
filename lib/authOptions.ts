import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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

        // ここでログインロジックを記述（今回は固定ユーザーで仮実装）
        const validUser = {
          id: "1",
          name: "前田大輝",
          email: "daiki.maeda.web@gmail.com",
          password: "pass1234", // 開発用（本番ではハッシュ化された値を使う）
        };

        if (username === validUser.email && password === validUser.password) {
          return {
            id: validUser.id,
            name: validUser.name,
            email: validUser.email,
          };
        }

        return null;
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
