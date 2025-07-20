import { promises as fs } from "fs";
import path from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return new Response(JSON.stringify({ schools: [] }), { status: 400 });
  }

  const filePath = path.join(process.cwd(), "data", "schools.json");
  const json = await fs.readFile(filePath, "utf-8");
  const schools = JSON.parse(json);

  const adminSchools = Object.entries(schools)
    .filter(([_, admins]: [string, string[]]) =>
      admins.map((a) => a.toLowerCase()).includes(email.toLowerCase())
    )
    .map(([id]) => id);

  return new Response(JSON.stringify({ schools: adminSchools }), {
    status: 200,
  });
}
