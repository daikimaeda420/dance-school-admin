// app/api/schools/route.js
import { promises as fs } from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "schools.json");

export async function POST(req) {
  try {
    const body = await req.json();
    const { schoolId, adminEmail } = body;

    if (!schoolId || !adminEmail) {
      return new Response("Invalid input", { status: 400 });
    }

    let schools = {};
    try {
      const data = await fs.readFile(filePath, "utf8");
      schools = JSON.parse(data);
    } catch {
      // 初回用。ファイルが無くてもOK。
    }

    if (!schools[schoolId]) {
      schools[schoolId] = [];
    }

    if (!schools[schoolId].includes(adminEmail)) {
      schools[schoolId].push(adminEmail);
    }

    await fs.writeFile(filePath, JSON.stringify(schools, null, 2));
    return new Response("Saved", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("Server Error", { status: 500 });
  }
}

export async function GET() {
  try {
    const data = await fs.readFile(filePath, "utf8");
    const schools = JSON.parse(data);
    return new Response(JSON.stringify(schools), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response("読み込みエラー", { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      return new Response("schoolId is required", { status: 400 });
    }

    const data = await fs.readFile(filePath, "utf8");
    const schools = JSON.parse(data);

    delete schools[schoolId];

    await fs.writeFile(filePath, JSON.stringify(schools, null, 2));
    return new Response("Deleted", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("Delete Error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { schoolId, email, action } = body;

    if (!schoolId || !email || !["add", "remove"].includes(action)) {
      return new Response("Invalid input", { status: 400 });
    }

    const filePath = path.join(process.cwd(), "data", "schools.json");
    const data = await fs.readFile(filePath, "utf8");
    const schools = JSON.parse(data);

    if (!schools[schoolId]) {
      return new Response("School not found", { status: 404 });
    }

    const admins: string[] = schools[schoolId];

    if (action === "add" && !admins.includes(email)) {
      admins.push(email);
    }

    if (action === "remove") {
      schools[schoolId] = admins.filter((e) => e !== email);
    }

    await fs.writeFile(filePath, JSON.stringify(schools, null, 2));

    return new Response("Updated", { status: 200 });
  } catch (err) {
    console.error("PATCH error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
