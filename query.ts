import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const genres = await prisma.diagnosisGenre.findMany({ select: { slug: true, label: true, sortOrder: true } });
  console.log(genres);
}
main().catch(console.error).finally(() => prisma.$disconnect());
