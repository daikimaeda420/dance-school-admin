import { promises as fs } from "fs";
import path from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const school = searchParams.get("school");
  if (!school) {
    return new Response(JSON.stringify([]), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const filePath = path.join(process.cwd(), "public", "faq", `${school}.json`);

  try {
    const fileData = await fs.readFile(filePath, "utf8");
    const raw = JSON.parse(fileData);

    // options 内の next を最低限補完
    const normalized = raw.map((item: any) => {
      if (item.type === "select") {
        const options = Array.isArray(item.options) ? item.options : [];
        return {
          ...item,
          options: options.map((opt: any) => ({
            label: opt.label || "",
            next: {
              type: "question",
              question: opt?.next?.question || "",
              answer: opt?.next?.answer || "",
              url: opt?.next?.url || "",
            },
          })),
        };
      }
      return item;
    });

    return new Response(JSON.stringify(normalized, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const school = searchParams.get("school");
  if (!school) {
    return new Response(
      JSON.stringify({ error: "school が指定されていません" }),
      { status: 400 }
    );
  }

  const filePath = path.join(process.cwd(), "public", "faq", `${school}.json`);

  try {
    const body = await req.json();

    if (!Array.isArray(body)) {
      return new Response(
        JSON.stringify({ error: "FAQは配列である必要があります" }),
        { status: 400 }
      );
    }

    // 簡易バリデーション
    for (const item of body) {
      if (!item.type || !item.question) {
        return new Response(
          JSON.stringify({ error: "type と question は必須です" }),
          { status: 400 }
        );
      }
      if (item.type === "question" && typeof item.answer !== "string") {
        return new Response(JSON.stringify({ error: "answer が不正です" }), {
          status: 400,
        });
      }
      if (item.type === "select") {
        if (!Array.isArray(item.options)) {
          item.options = [];
        } else {
          item.options = item.options.filter(
            (opt: any) =>
              typeof opt.label === "string" &&
              opt.next &&
              typeof opt.next.question === "string" &&
              typeof opt.next.answer === "string"
          );
        }
      }
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(body, null, 2), "utf8");

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("FAQ保存エラー:", err);
    return new Response(JSON.stringify({ error: "保存に失敗しました" }), {
      status: 500,
    });
  }
}
