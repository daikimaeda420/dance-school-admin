// app/api/diagnosis/instructors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

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

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB

type InstructorRow = {
  id: string;
  schoolId: string;
  label: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  photoMime: string | null;
  hasPhoto: boolean;
};

function normalizeInstructor(r: {
  id: string;
  schoolId: string;
  label: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  photoMime: string | null;
}): InstructorRow {
  return {
    id: r.id,
    schoolId: r.schoolId,
    label: r.label,
    slug: r.slug,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
    photoMime: r.photoMime ?? null,
    hasPhoto: !!r.photoMime, // ✅ photoData を参照しない
  };
}

// GET /api/diagnosis/instructors?schoolId=xxx
export async function GET(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId")?.trim();
  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId が必要です" },
      { status: 400 }
    );
  }

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

  return NextResponse.json(rows.map(normalizeInstructor));
}

// POST /api/diagnosis/instructors
// - multipart/form-data: {id, schoolId, label, slug, sortOrder, isActive, file?}
// - JSON: {id, schoolId, label, slug, sortOrder, isActive}
export async function POST(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";

  // multipart
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();

    const id = String(fd.get("id") ?? "").trim();
    const schoolId = String(fd.get("schoolId") ?? "").trim();
    const label = String(fd.get("label") ?? "").trim();
    const slug = String(fd.get("slug") ?? "").trim();
    const sortOrder = toNum(fd.get("sortOrder"), 0);
    const isActive = toBool(fd.get("isActive"), true);

    if (!id || !schoolId || !label || !slug) {
      return NextResponse.json(
        { message: "id / schoolId / label / slug は必須です" },
        { status: 400 }
      );
    }

    const file = fd.get("file");
    let photoData: Buffer | null = null;
    let photoMime: string | null = null;

    if (file && file instanceof File && file.size > 0) {
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          {
            message: `画像サイズが大きすぎます（上限 ${MAX_IMAGE_BYTES} bytes）`,
          },
          { status: 400 }
        );
      }
      photoMime = file.type || "application/octet-stream";
      const ab = await file.arrayBuffer();
      photoData = Buffer.from(ab);
    }

    // ✅ photoData を保存する（ここが元コードのバグ）
    const created = await prisma.diagnosisInstructor.create({
      data: {
        id,
        schoolId,
        label,
        slug,
        sortOrder,
        isActive,
        photoMime,
        photoData, // ✅ 追加
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

    return NextResponse.json(normalizeInstructor(created), { status: 201 });
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
    return NextResponse.json(
      { message: "id / schoolId / label / slug は必須です" },
      { status: 400 }
    );
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

  return NextResponse.json(normalizeInstructor(created), { status: 201 });
}

// PUT /api/diagnosis/instructors
// - multipart/form-data: {id, schoolId, label, slug, sortOrder, isActive, file?, clearPhoto?}
// - JSON: {id, schoolId, label, slug, sortOrder, isActive}
export async function PUT(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

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
      return NextResponse.json(
        { message: "id / schoolId / label / slug は必須です" },
        { status: 400 }
      );
    }

    const existing = await prisma.diagnosisInstructor.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "対象が見つかりません" },
        { status: 404 }
      );
    }

    const file = fd.get("file");
    const clearPhoto = toBool(fd.get("clearPhoto"), false);

    const data: any = { label, slug, sortOrder, isActive };

    if (clearPhoto) {
      data.photoData = null;
      data.photoMime = null;
    } else if (file && file instanceof File && file.size > 0) {
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          {
            message: `画像サイズが大きすぎます（上限 ${MAX_IMAGE_BYTES} bytes）`,
          },
          { status: 400 }
        );
      }
      data.photoMime = file.type || "application/octet-stream";
      const ab = await file.arrayBuffer();
      data.photoData = Buffer.from(ab);
    }

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

    return NextResponse.json(normalizeInstructor(updated));
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
    return NextResponse.json(
      { message: "id / schoolId / label / slug は必須です" },
      { status: 400 }
    );
  }

  const existing = await prisma.diagnosisInstructor.findFirst({
    where: { id: body.id.trim(), schoolId: body.schoolId.trim() },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json(
      { message: "対象が見つかりません" },
      { status: 404 }
    );
  }

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

  return NextResponse.json(normalizeInstructor(updated));
}

// DELETE /api/diagnosis/instructors?id=xxx&schoolId=yyy（無効化）
export async function DELETE(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();
  const schoolId = searchParams.get("schoolId")?.trim();

  if (!id || !schoolId) {
    return NextResponse.json(
      { message: "id / schoolId が必要です" },
      { status: 400 }
    );
  }

  const existing = await prisma.diagnosisInstructor.findFirst({
    where: { id, schoolId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json(
      { message: "対象が見つかりません" },
      { status: 404 }
    );
  }

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

  return NextResponse.json(normalizeInstructor(updated));
}
