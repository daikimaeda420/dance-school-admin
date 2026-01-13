// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// ✅ production でも保持してOK（Vercelで安定しやすい）
globalForPrisma.prisma = prisma;

// default export は混乱の元なので消すのおすすめ
// export default prisma;
