// types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    schoolId: string | null;
  }

  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      schoolId: string | null;
    };
  }

  interface JWT {
    role: string;
    schoolId: string | null;
  }
}
