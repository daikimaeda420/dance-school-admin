import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const courses = await prisma.diagnosisCourse.findMany({ select: { id: true, label: true, schoolId: true, isActive: true }})
  console.log(courses)
}
main()
