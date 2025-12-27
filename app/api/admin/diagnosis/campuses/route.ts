// app/api/admin/diagnosis/campuses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return session;
}

// GET /api/admin/diagnosis/campuses?schoolId=xxx
export async function GET(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      return NextResponse.json(
        { message: "schoolId が必要です" },
        { status: 400 }
      );
    }

    const campuses = await prisma.diagnosisCampus.findMany({
      where: { schoolId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(campuses);
  } catch (e) {
    console.error("Campus GET failed:", e);
    return NextResponse.json(
      { message: "校舎一覧の取得に失敗しました。" },
      { status: 500 }
    );
  }
}

// POST /api/admin/diagnosis/campuses
export async function POST(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);

    if (
      !body ||
      !body.schoolId ||
      !body.label ||
      !body.slug ||
      typeof body.schoolId !== "string" ||
      typeof body.label !== "string" ||
      typeof body.slug !== "string"
    ) {
      return NextResponse.json(
        { message: "schoolId / label / slug は必須です" },
        { status: 400 }
      );
    }

    const schoolId = body.schoolId.trim();
    const label = body.label.trim();
    const slug = body.slug.trim();

    if (!schoolId || !label || !slug) {
      return NextResponse.json(
        { message: "schoolId / label / slug は必須です" },
        { status: 400 }
      );
    }

    const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : 0;

    // ✅ 追加3項目（空文字は null に寄せる）
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const access = typeof body.access === "string" ? body.access.trim() : "";
    const googleMapUrl =
      typeof body.googleMapUrl === "string" ? body.googleMapUrl.trim() : "";

    const campus = await prisma.diagnosisCampus.create({
      data: {
        schoolId,
        label,
        slug,
        sortOrder,
        isOnline: !!body.isOnline,
        isActive: body.isActive !== false,

        // ✅ 追加
        address: address || null,
        access: access || null,
        googleMapUrl: googleMapUrl || null,
      },
    });

    return NextResponse.json(campus, { status: 201 });
  } catch (e: any) {
    console.error("Campus POST failed:", e);

    // Prismaの代表的なエラーを分かりやすく
    const code = e?.code;

    if (code === "P2002") {
      // Unique constraint failed
      return NextResponse.json(
        { message: "このslugは既に使われています（重複）。" },
        { status: 409 }
      );
    }

    if (code === "P2022") {
      // Column does not exist
      return NextResponse.json(
        {
          message:
            "DBに必要なカラムが見つかりません（migration未適用の可能性）。",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: e?.message || "校舎の作成に失敗しました。" },
      { status: 500 }
    );
  }
}
