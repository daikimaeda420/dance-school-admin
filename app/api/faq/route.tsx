// app/api/faq/route.ts

import { promises as fs } from "fs";
import path from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const school = searchParams.get("school") || "default";
  const filePath = path.join(process.cwd(), "public", "faq", `${school}.json`);

  try {
    const fileData = await fs.readFile(filePath, "utf8");
    return new Response(fileData, { status: 200 });
  } catch (err) {
    return new Response("[]", { status: 200 });
  }
}
