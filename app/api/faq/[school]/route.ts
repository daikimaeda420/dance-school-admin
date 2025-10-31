import { NextResponse } from "next/server";
import { getFaqDocument } from "@/lib/faq/repo";
import { isValidFAQ } from "@/lib/faq/validate";

export async function GET(
  _req: Request,
  { params }: { params: { school: string } }
) {
  const school = params.school;
  const result = await getFaqDocument(school);

  if (!result) {
    return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
  }

  const { doc, etag } = result;

  if (!isValidFAQ(doc)) {
    return NextResponse.json(
      { error: "Invalid FAQ structure" },
      { status: 422 }
    );
  }

  const res = NextResponse.json(doc, {
    status: 200,
    headers: {
      // CDN/ブラウザキャッシュ最適化
      ETag: etag,
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });

  return res;
}
