// scripts/importFaq.cjs
const { readFile } = require("fs").promises;
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const schoolId = process.argv[2];
  const filePath = process.argv[3] || "data/faq.json";

  if (!schoolId) {
    console.error("Usage: npm run db:import -- <schoolId> [path/to/faq.json]");
    process.exit(1);
  }

  const raw = await readFile(filePath, "utf-8");
  const items = JSON.parse(raw);

  await prisma.faq.upsert({
    where: { schoolId },
    update: { items, updatedBy: "import-script" },
    create: { schoolId, items, updatedBy: "import-script" },
  });

  console.log(`Imported FAQ for schoolId=${schoolId} from ${filePath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
