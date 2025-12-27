// app/api/admin/diagnosis/campuses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return null;
  }
  return session;
}

// PATCH /api/admin/diagnosis/campuses/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const id = params.id;
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { message: "更新データがありません" },
      { status: 400 }
    );
  }

  const data: any = {};
  if (typeof body.label === "string") data.label = body.label;
  if (typeof body.slug === "string") data.slug = body.slug;
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
  if (typeof body.isOnline === "boolean") data.isOnline = body.isOnline;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  // ✅ 追加：null も許可（空にしたいケース）
  if (typeof body.address === "string")
    data.address = body.address.trim() || null;
  if (body.address === null) data.address = null;

  if (typeof body.access === "string") data.access = body.access.trim() || null;
  if (body.access === null) data.access = null;

  if (typeof body.googleMapUrl === "string")
    data.googleMapUrl = body.googleMapUrl.trim() || null;
  if (body.googleMapUrl === null) data.googleMapUrl = null;

  // ✅ 何も更新対象が無いなら弾く（空PATCH対策）
  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { message: "更新できる項目がありません" },
      { status: 400 }
    );
  }

  const updated = await prisma.diagnosisCampus.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/diagnosis/campuses/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const id = params.id;

  await prisma.diagnosisCampus.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
