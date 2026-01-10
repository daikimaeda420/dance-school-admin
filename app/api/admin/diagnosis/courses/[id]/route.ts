// app/api/admin/diagnosis/courses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return session;
}

type PatchBody = {
  label?: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
  q2AnswerTags?: string[];
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const body = (await req.json()) as PatchBody;

    const q2 =
      body.q2AnswerTags === undefined
        ? undefined
        : Array.isArray(body.q2AnswerTags)
        ? body.q2AnswerTags.filter(
            (v) => typeof v === "string" && v.trim() !== ""
          )
        : [];

    const updated = await prisma.diagnosisCourse.update({
      where: { id },
      data: {
        ...(body.label !== undefined ? { label: body.label } : {}),
        ...(body.slug !== undefined ? { slug: body.slug } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(q2 !== undefined ? { q2AnswerTags: q2 } : {}),
      },
    });

    return NextResponse.json({ ok: true, course: updated });
  } catch (e: any) {
    console.error("[PATCH /admin/diagnosis/courses/:id] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

// ✅ 追加：DELETE /api/admin/diagnosis/courses/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.diagnosisCourse.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[DELETE /admin/diagnosis/courses/:id] error:", e);

    // 外部キー制約などで消せない場合
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Delete failed" },
      { status: 500 }
    );
  }
}
