import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  return session?.user?.email ? session : null;
}

function toBool(v: any, fallback: boolean) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  return fallback;
}

function toNum(v: any, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

// GET /api/diagnosis/instructors?schoolId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId")?.trim();
    if (!schoolId) return json("schoolId が必要です", 400);

    const rows = await prisma.diagnosisInstructor.findMany({
      where: { schoolId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        schoolId: true,
        label: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        photoMime: true,
      },
    });

    // フロントが配列前提で map するので、配列で返す
    return NextResponse.json(
      rows.map((r) => ({
        ...r,
        photoMime: r.photoMime ?? null,
      }))
    );
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "DiagnosisInstructor の取得に失敗しました", 500);
  }
}

// POST /api/diagnosis/instructors (multipart or json)
export async function POST(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const ct = req.headers.get("content-type") || "";

    // multipart/form-data
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();

      const id = String(fd.get("id") ?? "").trim();
      const schoolId = String(fd.get("schoolId") ?? "").trim();
      const label = String(fd.get("label") ?? "").trim();
      const slug = String(fd.get("slug") ?? "").trim();
      const sortOrder = toNum(fd.get("sortOrder"), 0);
      const isActive = toBool(fd.get("isActive"), true);

      if (!id || !schoolId || !label || !slug) {
        return json("id / schoolId / label / slug は必須です", 400);
      }

      // 画像は /api/diagnosis/instructors/photo に任せる（ここでは保存しない）
      // file が来ても無視してOK（UI互換のため）

      const created = await prisma.diagnosisInstructor.create({
        data: { id, schoolId, label, slug, sortOrder, isActive },
        select: {
          id: true,
          schoolId: true,
          label: true,
          slug: true,
          sortOrder: true,
          isActive: true,
          photoMime: true,
        },
      });

      return NextResponse.json(
        { ...created, photoMime: created.photoMime ?? null },
        { status: 201 }
      );
    }

    // JSON
    const body = await req.json().catch(() => null);
    if (
      !body ||
      typeof body.id !== "string" ||
      typeof body.schoolId !== "string" ||
      typeof body.label !== "string" ||
      typeof body.slug !== "string"
    ) {
      return json("id / schoolId / label / slug は必須です", 400);
    }

    const created = await prisma.diagnosisInstructor.create({
      data: {
        id: body.id.trim(),
        schoolId: body.schoolId.trim(),
        label: body.label.trim(),
        slug: body.slug.trim(),
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
        isActive: body.isActive !== false,
      },
      select: {
        id: true,
        schoolId: true,
        label: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        photoMime: true,
      },
    });

    return NextResponse.json(
      { ...created, photoMime: created.photoMime ?? null },
      { status: 201 }
    );
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "作成に失敗しました", 500);
  }
}

// PUT /api/diagnosis/instructors (multipart or json)
export async function PUT(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const ct = req.headers.get("content-type") || "";

    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();

      const id = String(fd.get("id") ?? "").trim();
      const schoolId = String(fd.get("schoolId") ?? "").trim();
      const label = String(fd.get("label") ?? "").trim();
      const slug = String(fd.get("slug") ?? "").trim();
      const sortOrder = toNum(fd.get("sortOrder"), 0);
      const isActive = toBool(fd.get("isActive"), true);

      if (!id || !schoolId || !label || !slug) {
        return json("id / schoolId / label / slug は必須です", 400);
      }

      const existing = await prisma.diagnosisInstructor.findFirst({
        where: { id, schoolId },
        select: { id: true },
      });
      if (!existing) return json("対象が見つかりません", 404);

      // 画像は photo API に任せるのでここでは触らない
      // clearPhoto が来ても photoMime を null にするだけ（photo API と整合とるならここも不要）
      const clearPhoto = toBool(fd.get("clearPhoto"), false);

      const data: any = { label, slug, sortOrder, isActive };
      if (clearPhoto) data.photoMime = null;

      const updated = await prisma.diagnosisInstructor.update({
        where: { id: existing.id },
        data,
        select: {
          id: true,
          schoolId: true,
          label: true,
          slug: true,
          sortOrder: true,
          isActive: true,
          photoMime: true,
        },
      });

      return NextResponse.json({
        ...updated,
        photoMime: updated.photoMime ?? null,
      });
    }

    // JSON
    const body = await req.json().catch(() => null);
    if (
      !body ||
      typeof body.id !== "string" ||
      typeof body.schoolId !== "string" ||
      typeof body.label !== "string" ||
      typeof body.slug !== "string"
    ) {
      return json("id / schoolId / label / slug は必須です", 400);
    }

    const existing = await prisma.diagnosisInstructor.findFirst({
      where: { id: body.id.trim(), schoolId: body.schoolId.trim() },
      select: { id: true },
    });
    if (!existing) return json("対象が見つかりません", 404);

    const updated = await prisma.diagnosisInstructor.update({
      where: { id: existing.id },
      data: {
        label: body.label.trim(),
        slug: body.slug.trim(),
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
        isActive: body.isActive !== false,
      },
      select: {
        id: true,
        schoolId: true,
        label: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        photoMime: true,
      },
    });

    return NextResponse.json({
      ...updated,
      photoMime: updated.photoMime ?? null,
    });
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "更新に失敗しました", 500);
  }
}

// DELETE /api/diagnosis/instructors?id=xxx&schoolId=yyy（無効化）
export async function DELETE(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim();
    const schoolId = searchParams.get("schoolId")?.trim();
    if (!id || !schoolId) return json("id / schoolId が必要です", 400);

    const existing = await prisma.diagnosisInstructor.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) return json("対象が見つかりません", 404);

    const updated = await prisma.diagnosisInstructor.update({
      where: { id: existing.id },
      data: { isActive: false },
      select: {
        id: true,
        schoolId: true,
        label: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        photoMime: true,
      },
    });

    return NextResponse.json({
      ...updated,
      photoMime: updated.photoMime ?? null,
    });
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "無効化に失敗しました", 500);
  }
}
