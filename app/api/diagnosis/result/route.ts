// app/api/diagnosis/result/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  QUESTIONS,
  concernMessages,
  ConcernMessageKey,
} from "@/lib/diagnosis/config";

// 固定文（あなたが確定した強いコピー）
// ※別ファイルに切り出すのが理想だけど、まずは route.ts 内でもOK
const Q2_FIXED: Record<string, string> = {
  "2-1":
    "運動が苦手でも大丈夫！リズムの取り方から遊ぶように学べるクラスがあります。",
  "2-2":
    "基礎体力があるあなたなら上達も早いはず。まずは基礎ステップから始めましょう！",
  "2-3":
    "ブランクがあっても安心。身体が感覚を思い出すところから楽しく再開できます。",
  "2-4":
    "基礎ができているあなたには、振付をカッコよく魅せるコツを学ぶ段階がおすすめです。",
  "2-5":
    "経験者のあなたも満足できる、ハイレベルな技術と表現力を磨くクラスを用意しています。",
};

const Q3_FIXED: Record<string, string> = {
  "3-1":
    "ご安心ください。この年代は『ダンス技術』よりも、音楽を使って『楽しく体を動かす遊び』からスタートします。",
  "3-2":
    "同年代のお友達がたくさん！学校で流行っている曲も使いながら、まずは『ダンスって楽しい！』と感じてもらいます。",
  "3-3":
    "学校帰りに寄れる時間帯で、同世代の仲間と部活感覚で熱くなれるクラスがおすすめです！",
  "3-4":
    "忙しい学生さんでも通いやすい柔軟なスケジュール。お得な『学割プラン』も適用されます！",
  "3-5":
    "お仕事帰りにリフレッシュ！残業後でも間に合う『平日遅めのクラス』や、土日のクラスが充実しています。",
  "3-6":
    "家事の合間を有効活用！比較的空いていて広々と踊れる『平日お昼のクラス』が狙い目です。",
};

const Q5_FIXED: Record<string, string> = {
  "5-1":
    "『怖いのは絶対にイヤ！』というあなたへ。 マッチしたのは、何度間違えても笑顔で『大丈夫！』と言ってくれる、仏のように優しい先生です。 プレッシャーゼロの環境で、まずは『ダンスを嫌いにならないこと』から始めましょう。",
  "5-2":
    "本気で上手くなりたいあなたの熱量に応えます。 担当するのは、数々のプロを輩出してきた実力派講師。 **『楽しいだけ』のレッスンは卒業。**あなたの動きのクセを見抜き、最短でプロレベルに近づくための『本物の技術』を叩き込みます。",
  "5-3":
    "感覚ではなく『理論』で納得したいあなたへ。 指導歴の長いベテラン講師が、『なぜその動きになるのか』を体の構造から解説します。 遠回りは一切ナシ。正しいフォームを基礎から積み上げる、最も確実な上達ルートを案内します。",
  "5-4":
    "堅苦しいレッスンは一切ナシ！ 先生というより**『ダンスが上手い親友』**と一緒に踊るような感覚です。 休憩時間には恋バナや推しの話で盛り上がることも。人見知りのあなたでも、初日から自然と馴染めるアットホームなクラスです。",
};

const Q6_FIXED: Record<ConcernMessageKey, string> = {
  Msg_Pace:
    "『待って、今のどうやるの？』が言える環境です。ご安心ください、あなたがマッチしたのは、**全員が納得するまで次に進まない『超・親切設計』**のクラス。周りを気にする必要はありません。あなたのペースが、クラスのペースになります。",
  Msg_Atmosphere:
    "その心配、ドアを開けた瞬間に消えます。実はこのクラス、9割がお一人様でのスタートでした。新しい仲間を『ウェルカム！』と迎える温かい空気があるので、転校生のようなアウェー感は一切ナシ。すぐにレッスン仲間ができますよ。",
  Msg_Sense:
    "ダンスはセンスではなく『パズル』です。あなたが選んだ先生は、感覚ではなく**『右足をここ、次は左手』と図解のように教える**プロ。運動が苦手だった人ほど、『これなら分かる！』と驚いて帰られます。60分後、自分の動きに感動しますよ。",
  Msg_LevelUp:
    "『お客様扱い』は一切しません。あなたが求めているのは、楽しさより『成長』ですよね。 担当するのは、数々のプロを輩出した実力派講師。体験レッスンでも容赦なく**『あなたの動きの悪い癖』を見抜き、修正します**。 『本気で変わりたい』という覚悟に、120%の熱量で応えることを約束します。",
  Msg_Consult:
    "無理に踊る必要はありません！まずは**『スクールの雰囲気を見るだけ』でも大歓迎です。実際のレッスン風景を眺めながら、『私ならどのクラスが合いそう？』とスタッフに相談できるプラン**をご用意しました。まずはスタジオの空気を吸いに来てください。",
};

type DiagnosisRequestBody = {
  schoolId?: string;
  answers?: Record<string, string>;
};

const REQUIRED_QUESTION_IDS = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"] as const;

function getConcernKey(answers: Record<string, string>): ConcernMessageKey {
  const q6 = QUESTIONS.find((q) => q.id === "Q6");
  const optionId = answers["Q6"];
  const opt = q6?.options.find((o) => o.id === optionId);
  const key = opt?.messageKey ?? "Msg_Consult";
  return key as ConcernMessageKey;
}

async function resolveBySlug(args: {
  schoolId: string;
  model: "DiagnosisCampus" | "DiagnosisGenre";
  slug: string;
}) {
  const { schoolId, model, slug } = args;

  if (model === "DiagnosisCampus") {
    return prisma.diagnosisCampus.findFirst({
      where: { schoolId, slug, isActive: true },
      select: { id: true, label: true, slug: true, isOnline: true },
    });
  }
}

type ResultRow = {
  id: string;
  schoolId: string;
  title: string;
  body: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function POST(req: NextRequest) {
  let body: DiagnosisRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "JSONの形式が不正です。" },
      { status: 400 }
    );
  }

  const schoolId = body.schoolId ?? "";
  const answers = body.answers ?? {};

  if (!schoolId) {
    return NextResponse.json(
      { error: "NO_SCHOOL_ID", message: "schoolId が指定されていません。" },
      { status: 400 }
    );
  }

  const missing = REQUIRED_QUESTION_IDS.filter((id) => !answers[id]);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "MISSING_ANSWERS",
        message: `未回答の質問があります: ${missing.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Q1/Q4 だけ DB（slug）
  const campusSlug = answers["Q1"];
  const genreSlug = answers["Q4"];

  const [campus, genre] = await Promise.all([
    resolveBySlug({ schoolId, model: "DiagnosisCampus", slug: campusSlug }),
    resolveBySlug({ schoolId, model: "DiagnosisGenre", slug: genreSlug }),
  ]);

  if (!campus) {
    return NextResponse.json(
      {
        error: "NO_CAMPUS",
        message:
          "選択した校舎が見つかりません（管理画面の登録/有効化を確認してください）。",
      },
      { status: 400 }
    );
  }
  if (!genre) {
    return NextResponse.json(
      {
        error: "NO_GENRE",
        message:
          "選択したジャンルが見つかりません（管理画面の登録/有効化を確認してください）。",
      },
      { status: 400 }
    );
  }

  // ✅ campus + genre で結果を引く（仕様確定に合わせる）
  const rows = await prisma.$queryRaw<ResultRow[]>`
    select r.*
    from "DiagnosisResult" r
    where r."schoolId" = ${schoolId}
      and r."isActive" = true

      and exists (
        select 1 from "_ResultCampuses" x
        where (x."A" = r."id" and x."B" = ${campus.id})
           or (x."B" = r."id" and x."A" = ${campus.id})
      )

      and exists (
        select 1 from "_ResultGenres" x
        where (x."A" = r."id" and x."B" = ${genre.id})
           or (x."B" = r."id" and x."A" = ${genre.id})
      )

    order by r."sortOrder" asc
    limit 1
  `;

  const best = rows[0];
  if (!best) {
    return NextResponse.json(
      {
        error: "NO_MATCHED_RESULT",
        message:
          "この回答パターンに紐づく診断結果が見つかりません。管理画面で「診断結果」と（校舎/ジャンル）の紐づけを作成してください。",
      },
      { status: 400 }
    );
  }

  // Q2/Q3/Q5/Q6：固定文（画面用に返す）
  const q2Msg = Q2_FIXED[answers["Q2"]] ?? null;
  const q3Msg = Q3_FIXED[answers["Q3"]] ?? null;
  const q5Msg = Q5_FIXED[answers["Q5"]] ?? null;

  const concernKey = getConcernKey(answers);
  const concernStory = Q6_FIXED[concernKey]; // 強いコピー（仕様確定）
  const concernSupport = concernMessages[concernKey]; // 既存の運営説明（必要なら併記）

  return NextResponse.json({
    // UI用（完成UIに直結）
    viewModel: {
      headline: `あなたにおすすめ：${genre.label} × ${campus.label}`,
      subline: "予約は1分で完了。しつこい営業はありません。",
      campus: {
        id: campus.id,
        label: campus.label,
        slug: campus.slug,
      },
      genre: { id: genre.id, label: genre.label, slug: genre.slug },

      messages: {
        q2: q2Msg,
        q3: q3Msg,
        q5: q5Msg,
        q6: concernStory,
        // 必要なら補助として使う（UIで小さく表示）
        q6Support: concernSupport,
      },

      result: {
        id: best.id,
        title: best.title,
        body: best.body,
        ctaLabel: best.ctaLabel,
        ctaUrl: best.ctaUrl,
      },
    },

    // 互換用（今のフロントが壊れないように残すなら）
    pattern: "A",
    score: 100,
    breakdown: [],
  });
}
