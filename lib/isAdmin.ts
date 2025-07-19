// lib/isAdmin.ts
import { promises as fs } from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "schools.json");

export async function isAdmin(email: string): Promise<boolean> {
  try {
    const data = await fs.readFile(filePath, "utf8");
    const schools = JSON.parse(data);
    return Object.values(schools).some((admins: string[]) =>
      admins.includes(email)
    );
  } catch (err) {
    console.error("管理者チェックに失敗しました:", err);
    return false;
  }
}
