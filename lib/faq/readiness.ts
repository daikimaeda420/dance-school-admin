import { prisma } from "@/lib/prisma";

export type FaqReadinessStatus = "ok" | "warn" | "missing";

export type FaqReadinessItem = {
  title: string;
  status: FaqReadinessStatus;
  summary: string;
  detail: string;
  href: string;
  actionLabel: string;
};

export type FaqReadinessGroup = {
  title: string;
  description: string;
  items: FaqReadinessItem[];
};

export type FaqReadinessStat = {
  label: string;
  value: string;
  caption: string;
};

export type FaqReadinessSummary = {
  status: FaqReadinessStatus;
  statusLabel: string;
  completionPercent: number;
  okCount: number;
  warnCount: number;
  blockingCount: number;
  totalCount: number;
  activeDataLabel: string;
};

export type FaqReadinessReport = {
  schoolId: string;
  summary: FaqReadinessSummary;
  stats: FaqReadinessStat[];
  groups: FaqReadinessGroup[];
};

type WalkStats = {
  nodes: number;
  questions: number;
  selects: number;
  options: number;
  maxDepth: number;
  validationErrors: string[];
  shortAnswers: number;
  answerLengthTotal: number;
  textParts: string[];
};

const TOPIC_CATEGORIES = [
  {
    label: "料金",
    keywords: ["料金", "月謝", "費用", "価格", "入会金", "支払い", "会費"],
  },
  {
    label: "体験",
    keywords: ["体験", "見学", "初回", "レッスン", " trial", "trial"],
  },
  {
    label: "持ち物・服装",
    keywords: ["持ち物", "服装", "靴", "シューズ", "着替", "更衣"],
  },
  {
    label: "初心者",
    keywords: ["初心者", "未経験", "初めて", "はじめて", "経験"],
  },
  {
    label: "アクセス",
    keywords: ["アクセス", "場所", "住所", "駅", "地図", "校舎", "スタジオ"],
  },
  {
    label: "予約・キャンセル",
    keywords: ["予約", "キャンセル", "変更", "振替", "欠席", "休み"],
  },
] as const;

function hrefWithSchoolId(path: string, schoolId: string) {
  const params = new URLSearchParams();
  if (schoolId) params.set("schoolId", schoolId);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function chatbotPreviewHref(schoolId: string) {
  const params = new URLSearchParams();
  if (schoolId) params.set("school", schoolId);
  const qs = params.toString();
  return qs ? `/embed/chatbot?${qs}` : "/embed/chatbot";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readText(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "未更新";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function daysSince(date: Date | null | undefined) {
  if (!date) return null;
  const elapsed = Date.now() - date.getTime();
  return Math.max(0, Math.floor(elapsed / (24 * 60 * 60 * 1000)));
}

function createInitialStats(): WalkStats {
  return {
    nodes: 0,
    questions: 0,
    selects: 0,
    options: 0,
    maxDepth: 0,
    validationErrors: [],
    shortAnswers: 0,
    answerLengthTotal: 0,
    textParts: [],
  };
}

function addValidationError(stats: WalkStats, label: string) {
  stats.validationErrors.push(label);
}

function walkFaqItem(input: unknown, stats: WalkStats, path: string, depth: number) {
  if (!isRecord(input)) {
    addValidationError(stats, `${path}: アイテム形式が不正`);
    return;
  }

  stats.nodes++;
  stats.maxDepth = Math.max(stats.maxDepth, depth);

  const type = input.type === "select" ? "select" : "question";
  const question = readText(input.question).trim();
  if (question) stats.textParts.push(question);
  else addValidationError(stats, `${path}: 質問が空`);

  if (type === "question") {
    stats.questions++;
    const answer = readText(input.answer).trim();
    if (answer) {
      stats.textParts.push(answer);
      stats.answerLengthTotal += answer.length;
      if (answer.length < 20) stats.shortAnswers++;
    } else {
      addValidationError(stats, `${path}: 回答が空`);
    }

    const url = readText(input.url).trim();
    if (url) {
      if (!/^https?:\/\//i.test(url)) {
        addValidationError(stats, `${path}: URLが不正`);
      }
    }
    return;
  }

  stats.selects++;
  const answer = readText(input.answer).trim();
  if (answer) stats.textParts.push(answer);

  const options = Array.isArray(input.options) ? input.options : [];
  if (options.length === 0) {
    addValidationError(stats, `${path}: 選択肢が空`);
  }

  options.forEach((option, index) => {
    stats.options++;
    if (!isRecord(option)) {
      addValidationError(stats, `${path}.options.${index}: 選択肢形式が不正`);
      return;
    }

    const label = readText(option.label).trim();
    if (label) stats.textParts.push(label);
    else addValidationError(stats, `${path}.options.${index}: ラベルが空`);

    walkFaqItem(option.next, stats, `${path}.options.${index}.next`, depth + 1);
  });
}

function analyzeFaqItems(rawItems: unknown): WalkStats {
  const stats = createInitialStats();
  const items = Array.isArray(rawItems) ? rawItems : [];
  items.forEach((item, index) => walkFaqItem(item, stats, `${index}`, 1));
  return stats;
}

function countCoveredTopics(searchText: string) {
  const lowerText = searchText.toLowerCase();
  const covered = TOPIC_CATEGORIES.filter((category) =>
    category.keywords.some((keyword) => lowerText.includes(keyword.toLowerCase())),
  );
  return {
    covered,
    missing: TOPIC_CATEGORIES.filter(
      (category) => !covered.some((item) => item.label === category.label),
    ),
  };
}

function getCompletionStatus(
  ok: boolean,
  warn = false,
): FaqReadinessStatus {
  if (!ok) return "missing";
  return warn ? "warn" : "ok";
}

async function loadReadinessData(schoolId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [faq, recentLogCount, recentSessions] = await Promise.all([
    prisma.faq.findUnique({
      where: { schoolId },
      select: {
        items: true,
        ctaLabel: true,
        ctaUrl: true,
        palette: true,
        launcherText: true,
        chatEnabled: true,
        diagnosisEnabled: true,
        bottomOffsetPc: true,
        bottomOffsetSp: true,
        updatedAt: true,
      },
    }),
    prisma.faqLog.count({
      where: {
        school: schoolId,
        timestamp: { gte: since },
      },
    }),
    prisma.faqLog.findMany({
      where: {
        school: schoolId,
        timestamp: { gte: since },
      },
      distinct: ["sessionId"],
      select: { sessionId: true },
    }),
  ]);

  return {
    faq,
    recentLogCount,
    recentSessionCount: recentSessions.length,
  };
}

export async function getFaqReadinessReport(
  schoolId: string,
): Promise<FaqReadinessReport> {
  const data = await loadReadinessData(schoolId);
  const stats = analyzeFaqItems(data.faq?.items ?? []);
  const hasFaqRecord = Boolean(data.faq);
  const hasContent = stats.nodes > 0 && stats.questions > 0;
  const validationErrorCount = stats.validationErrors.length;
  const averageAnswerLength =
    stats.questions > 0 ? Math.round(stats.answerLengthTotal / stats.questions) : 0;
  const topicCoverage = countCoveredTopics(stats.textParts.join("\n"));
  const coveredTopicCount = topicCoverage.covered.length;
  const hasCtaLabel = Boolean(data.faq?.ctaLabel?.trim());
  const hasCtaUrl = Boolean(data.faq?.ctaUrl?.trim());
  const ctaUrlValid = !hasCtaUrl || /^https?:\/\//i.test(data.faq?.ctaUrl ?? "");
  const ctaReady = hasCtaLabel && hasCtaUrl && ctaUrlValid;
  const ctaPartial = hasCtaLabel !== hasCtaUrl || !ctaUrlValid;
  const launcherText = data.faq?.launcherText?.trim() || "質問はコチラ";
  const hasValidOffsets =
    Number.isFinite(data.faq?.bottomOffsetPc ?? 24) &&
    Number.isFinite(data.faq?.bottomOffsetSp ?? 16) &&
    (data.faq?.bottomOffsetPc ?? 24) >= 0 &&
    (data.faq?.bottomOffsetSp ?? 16) >= 0 &&
    (data.faq?.bottomOffsetPc ?? 24) <= 240 &&
    (data.faq?.bottomOffsetSp ?? 16) <= 240;
  const updatedDaysAgo = daysSince(data.faq?.updatedAt);

  const setupItems: FaqReadinessItem[] = [
    {
      title: "FAQ本体",
      status: getCompletionStatus(hasContent),
      summary: hasContent ? `${stats.nodes}件 登録` : "未登録",
      detail: hasContent
        ? `${stats.questions}件の回答と${stats.selects}件の分岐を確認しました。`
        : "Q&A編集で、最初の質問と回答を登録してください。",
      href: "/faq",
      actionLabel: "Q&Aを編集",
    },
    {
      title: "チャットボット表示",
      status: getCompletionStatus(hasFaqRecord && Boolean(data.faq?.chatEnabled)),
      summary: data.faq?.chatEnabled ? "表示ON" : "表示OFF",
      detail: data.faq?.chatEnabled
        ? "埋め込み先でチャットボットを表示できる設定です。"
        : "公開する場合は、Q&A編集の埋め込み表示設定で表示をONにしてください。",
      href: "/faq",
      actionLabel: "表示設定を確認",
    },
    {
      title: "入力エラー",
      status: getCompletionStatus(hasContent && validationErrorCount === 0),
      summary:
        validationErrorCount === 0
          ? "エラーなし"
          : `${validationErrorCount}件 要修正`,
      detail:
        validationErrorCount === 0
          ? "空の質問・回答・選択肢ラベル・URL不正は見つかりませんでした。"
          : stats.validationErrors.slice(0, 3).join(" / "),
      href: "/faq",
      actionLabel: "入力を確認",
    },
    {
      title: "埋め込みコード",
      status: getCompletionStatus(hasContent),
      summary: hasContent ? "script 発行可" : "FAQ登録待ち",
      detail: hasContent
        ? `data-rizbo-school="${schoolId}" の埋め込みコードを利用できます。`
        : "FAQを保存すると、外部サイトへ貼るスクリプトを運用できます。",
      href: "/faq",
      actionLabel: "コードを確認",
    },
  ];

  const contentItems: FaqReadinessItem[] = [
    {
      title: "質問カテゴリ",
      status: getCompletionStatus(
        hasContent,
        hasContent && coveredTopicCount < TOPIC_CATEGORIES.length,
      ),
      summary: `${coveredTopicCount}/${TOPIC_CATEGORIES.length}カテゴリ`,
      detail:
        coveredTopicCount === TOPIC_CATEGORIES.length
          ? "主要な問い合わせカテゴリを一通りカバーしています。"
          : `不足候補: ${topicCoverage.missing.map((item) => item.label).join("、")}`,
      href: "/faq",
      actionLabel: "カテゴリを補完",
    },
    {
      title: "回答の厚み",
      status: getCompletionStatus(
        stats.questions > 0,
        stats.shortAnswers > 0 || (stats.questions > 0 && averageAnswerLength < 35),
      ),
      summary:
        stats.questions > 0
          ? `平均 ${averageAnswerLength}文字`
          : "回答なし",
      detail:
        stats.shortAnswers > 0
          ? `${stats.shortAnswers}件の回答が短めです。料金・条件・次の行動まで書くと自己解決率が上がります。`
          : "回答文の長さは最低限の目安を満たしています。",
      href: "/faq",
      actionLabel: "回答を確認",
    },
    {
      title: "分岐設計",
      status: getCompletionStatus(
        hasContent,
        hasContent && (stats.selects === 0 || stats.options < stats.selects * 2),
      ),
      summary: `${stats.selects}分岐 / ${stats.options}選択肢`,
      detail:
        stats.selects > 0
          ? "選択肢ブロックで、ユーザーの目的別に回答へ誘導できます。"
          : "問い合わせが増えたら、料金・体験・アクセスなどを選択肢で分けると探しやすくなります。",
      href: "/faq",
      actionLabel: "分岐を確認",
    },
  ];

  const conversionItems: FaqReadinessItem[] = [
    {
      title: "CTAボタン",
      status: ctaReady ? "ok" : ctaPartial ? "missing" : "warn",
      summary: ctaReady ? "設定済み" : ctaPartial ? "入力不完全" : "未設定",
      detail: ctaReady
        ? "チャット下部から申込・体験予約ページへ誘導できます。"
        : ctaPartial
          ? "CTA文言とURLの両方を入力し、URLは https:// から始めてください。"
          : "任意項目ですが、体験予約などの導線を置くとCVにつながります。",
      href: "/faq",
      actionLabel: "CTAを確認",
    },
    {
      title: "ランチャー文言",
      status: getCompletionStatus(hasContent && Boolean(launcherText)),
      summary: launcherText,
      detail: "チャット起動ボタン付近に出る短い案内文です。",
      href: "/faq",
      actionLabel: "文言を確認",
    },
    {
      title: "診断バナー連携",
      status: data.faq?.diagnosisEnabled ? "ok" : "warn",
      summary: data.faq?.diagnosisEnabled ? "表示ON" : "表示OFF",
      detail: data.faq?.diagnosisEnabled
        ? "チャットボットと相性診断への導線を同時に出せます。"
        : "相性診断も使う場合は、診断バナーをONにしてください。",
      href: hrefWithSchoolId("/admin/diagnosis/checklist", schoolId),
      actionLabel: "診断設定を確認",
    },
  ];

  const operationsItems: FaqReadinessItem[] = [
    {
      title: "利用ログ",
      status: data.recentLogCount > 0 ? "ok" : "warn",
      summary: `${data.recentSessionCount}セッション / ${data.recentLogCount}件`,
      detail:
        data.recentLogCount > 0
          ? "直近30日のチャット利用ログがあります。質問傾向の改善に使えます。"
          : "直近30日の利用ログがありません。埋め込み先で表示・導線を確認してください。",
      href: "/admin/chat-history",
      actionLabel: "ログを確認",
    },
    {
      title: "最終更新",
      status: getCompletionStatus(
        hasFaqRecord,
        typeof updatedDaysAgo === "number" && updatedDaysAgo > 90,
      ),
      summary: formatDate(data.faq?.updatedAt),
      detail:
        typeof updatedDaysAgo === "number"
          ? updatedDaysAgo > 90
            ? `${updatedDaysAgo}日更新されていません。料金や体験条件の変更が反映されているか確認してください。`
            : `${updatedDaysAgo}日前に更新されています。`
          : "FAQがまだ保存されていません。",
      href: "/faq",
      actionLabel: "更新内容を確認",
    },
    {
      title: "テーマ・表示位置",
      status: getCompletionStatus(hasFaqRecord && hasValidOffsets),
      summary: `${data.faq?.palette ?? "未設定"} / PC ${
        data.faq?.bottomOffsetPc ?? 24
      }px / SP ${data.faq?.bottomOffsetSp ?? 16}px`,
      detail: hasValidOffsets
        ? "テーマカラーと表示位置は利用可能な範囲です。"
        : "表示位置の値が大きすぎる可能性があります。0〜240px程度で調整してください。",
      href: "/faq",
      actionLabel: "見た目を確認",
    },
    {
      title: "公開プレビュー",
      status: getCompletionStatus(hasContent && Boolean(data.faq?.chatEnabled)),
      summary: hasContent ? "確認可能" : "FAQ登録待ち",
      detail: "実際の埋め込み表示に近い状態で、チャットの起動と回答遷移を確認できます。",
      href: chatbotPreviewHref(schoolId),
      actionLabel: "プレビューを開く",
    },
  ];

  const groups: FaqReadinessGroup[] = [
    {
      title: "公開準備",
      description: "チャットボットを外部サイトで表示するための基礎設定です。",
      items: setupItems,
    },
    {
      title: "回答内容",
      description: "ユーザーが自己解決しやすいQ&A構成になっているかを確認します。",
      items: contentItems,
    },
    {
      title: "申込導線",
      description: "体験予約・診断など次の行動へつなげるための設定です。",
      items: conversionItems,
    },
    {
      title: "運用確認",
      description: "公開後の利用状況と、継続的に見直すべき項目です。",
      items: operationsItems,
    },
  ];

  const allItems = groups.flatMap((group) => group.items);
  const blockingCount = allItems.filter((item) => item.status === "missing").length;
  const warnCount = allItems.filter((item) => item.status === "warn").length;
  const okCount = allItems.filter((item) => item.status === "ok").length;
  const totalCount = allItems.length;
  const completionPercent = Math.round((okCount / totalCount) * 100);
  const status: FaqReadinessStatus =
    blockingCount > 0 ? "missing" : warnCount > 0 ? "warn" : "ok";
  const statusLabel =
    blockingCount > 0
      ? `${blockingCount}件 未設定`
      : warnCount > 0
        ? `${warnCount}件 要確認`
        : "すべてOK";
  const activeDataLabel = `${stats.questions}/${stats.selects}/${stats.options}`;

  return {
    schoolId,
    summary: {
      status,
      statusLabel,
      completionPercent,
      okCount,
      warnCount,
      blockingCount,
      totalCount,
      activeDataLabel,
    },
    stats: [
      {
        label: "完成度",
        value: `${completionPercent}%`,
        caption: `${okCount}/${totalCount}項目 OK`,
      },
      {
        label: "未設定",
        value: `${blockingCount}`,
        caption: "公開前に対応したい項目",
      },
      {
        label: "要確認",
        value: `${warnCount}`,
        caption: "回答品質・CV改善の余地",
      },
      {
        label: "FAQ構成",
        value: activeDataLabel,
        caption: "質問 / 分岐 / 選択肢",
      },
    ],
    groups,
  };
}
