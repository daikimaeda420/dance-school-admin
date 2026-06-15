import { prisma } from "@/lib/prisma";
import { QUESTIONS } from "@/lib/diagnosis/config";

export type DiagnosisReadinessStatus = "ok" | "warn" | "missing";

export type DiagnosisReadinessItem = {
  title: string;
  status: DiagnosisReadinessStatus;
  summary: string;
  detail: string;
  href: string;
  actionLabel: string;
};

export type DiagnosisReadinessGroup = {
  title: string;
  description: string;
  items: DiagnosisReadinessItem[];
};

export type DiagnosisReadinessStat = {
  label: string;
  value: string;
  caption: string;
};

export type DiagnosisReadinessSummary = {
  status: DiagnosisReadinessStatus;
  statusLabel: string;
  completionPercent: number;
  okCount: number;
  warnCount: number;
  blockingCount: number;
  totalCount: number;
  activeDataLabel: string;
};

export type DiagnosisReadinessReport = {
  schoolId: string;
  summary: DiagnosisReadinessSummary;
  stats: DiagnosisReadinessStat[];
  groups: DiagnosisReadinessGroup[];
};

function hrefWithSchoolId(path: string, schoolId: string) {
  const params = new URLSearchParams();
  if (schoolId) params.set("schoolId", schoolId);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function formatRatio(done: number, total: number) {
  if (total === 0) return "0/0";
  return `${done}/${total}`;
}

function getStatus(ok: boolean, warn = false): DiagnosisReadinessStatus {
  if (!ok) return "missing";
  return warn ? "warn" : "ok";
}

function includesAny(label: string, keywords: string[]) {
  return keywords.some((keyword) => label.includes(keyword));
}

function addToSetMap(map: Map<string, Set<string>>, key: string, value: string) {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}

function countLinkedItems(ids: string[], linksById: Map<string, Set<string>>) {
  return ids.filter((id) => (linksById.get(id)?.size ?? 0) > 0).length;
}

async function loadReadinessData(schoolId: string) {
  const [
    campuses,
    courses,
    lifestyles,
    genres,
    instructors,
    instructorCourseLinks,
    instructorCampusLinks,
    instructorOptionLinks,
    scheduleSlots,
    form,
    emailSetting,
    faqCounts,
    mediaRows,
  ] = await Promise.all([
    prisma.diagnosisCampus.findMany({
      where: { schoolId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        isActive: true,
        address: true,
        access: true,
        googleMapUrl: true,
        googleMapEmbedUrl: true,
      },
    }),
    prisma.diagnosisCourse.findMany({
      where: { schoolId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        isActive: true,
        q2AnswerTags: true,
        genreTags: true,
        description: true,
        photoMime: true,
        youtubeVideoId: true,
      },
    }),
    prisma.diagnosisLifestyle.findMany({
      where: { schoolId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, isActive: true },
    }),
    prisma.diagnosisGenre.findMany({
      where: { schoolId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, isActive: true },
    }),
    prisma.diagnosisInstructor.findMany({
      where: { schoolId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        isActive: true,
        photoMime: true,
        charmTags: true,
        introduction: true,
      },
    }),
    prisma.diagnosisInstructorCourse.findMany({
      where: { schoolId },
      select: { instructorId: true, courseId: true },
    }),
    prisma.diagnosisInstructorCampus.findMany({
      where: { schoolId },
      select: { instructorId: true, campusId: true },
    }),
    prisma.diagnosisInstructorQ6Option.findMany({
      where: { schoolId },
      select: { instructorId: true, optionId: true },
    }),
    prisma.diagnosisScheduleSlot.findMany({
      where: { schoolId },
      select: {
        id: true,
        isActive: true,
        courses: { select: { courseId: true } },
      },
    }),
    prisma.diagnosisForm.findUnique({
      where: { schoolId },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            label: true,
            required: true,
            isActive: true,
          },
        },
      },
    }),
    prisma.diagnosisFormEmailSetting.findUnique({
      where: { schoolId },
      select: {
        isActive: true,
        fromEmail: true,
        adminTo: true,
      },
    }),
    Promise.all([
      prisma.diagnosisFaq.count({ where: { schoolId } }),
      prisma.diagnosisFaq.count({ where: { schoolId, isActive: true } }),
    ]),
    prisma.diagnosisMedia.findMany({
      where: { schoolId },
      select: { key: true, photoMime: true, textData: true },
    }),
  ]);

  return {
    campuses,
    courses,
    lifestyles,
    genres,
    instructors,
    instructorCourseLinks,
    instructorCampusLinks,
    instructorOptionLinks,
    scheduleSlots,
    form,
    emailSetting,
    faqCounts,
    mediaRows,
  };
}

export async function getDiagnosisReadinessReport(
  schoolId: string,
): Promise<DiagnosisReadinessReport> {
  const data = await loadReadinessData(schoolId);

  const activeCampuses = data.campuses.filter((row) => row.isActive);
  const activeCourses = data.courses.filter((row) => row.isActive);
  const activeLifestyles = data.lifestyles.filter((row) => row.isActive);
  const activeGenres = data.genres.filter((row) => row.isActive);
  const activeInstructors = data.instructors.filter((row) => row.isActive);
  const activeScheduleSlots = data.scheduleSlots.filter((row) => row.isActive);
  const activeFields = data.form?.fields.filter((row) => row.isActive) ?? [];

  const activeCampusIds = new Set(activeCampuses.map((row) => row.id));
  const activeCourseIds = new Set(activeCourses.map((row) => row.id));
  const activeInstructorIds = new Set(activeInstructors.map((row) => row.id));

  const coursesByInstructor = new Map<string, Set<string>>();
  const instructorsByCourse = new Map<string, Set<string>>();
  for (const link of data.instructorCourseLinks) {
    if (!activeInstructorIds.has(link.instructorId)) continue;
    if (!activeCourseIds.has(link.courseId)) continue;
    addToSetMap(coursesByInstructor, link.instructorId, link.courseId);
    addToSetMap(instructorsByCourse, link.courseId, link.instructorId);
  }

  const campusesByInstructor = new Map<string, Set<string>>();
  const instructorsByCampus = new Map<string, Set<string>>();
  for (const link of data.instructorCampusLinks) {
    if (!activeInstructorIds.has(link.instructorId)) continue;
    if (!activeCampusIds.has(link.campusId)) continue;
    addToSetMap(campusesByInstructor, link.instructorId, link.campusId);
    addToSetMap(instructorsByCampus, link.campusId, link.instructorId);
  }

  const optionsByInstructor = new Map<string, Set<string>>();
  for (const link of data.instructorOptionLinks) {
    if (!activeInstructorIds.has(link.instructorId)) continue;
    addToSetMap(optionsByInstructor, link.instructorId, link.optionId);
  }

  const activeCourseIdList = activeCourses.map((row) => row.id);
  const activeCampusIdList = activeCampuses.map((row) => row.id);
  const activeInstructorIdList = activeInstructors.map((row) => row.id);
  const coursesWithInstructors = countLinkedItems(
    activeCourseIdList,
    instructorsByCourse,
  );
  const campusesWithInstructors = countLinkedItems(
    activeCampusIdList,
    instructorsByCampus,
  );
  const instructorsWithCourses = countLinkedItems(
    activeInstructorIdList,
    coursesByInstructor,
  );
  const instructorsWithCampuses = countLinkedItems(
    activeInstructorIdList,
    campusesByInstructor,
  );
  const instructorsWithTeacherType = countLinkedItems(
    activeInstructorIdList,
    optionsByInstructor,
  );

  const coursesMissingTags = activeCourses.filter(
    (row) => row.q2AnswerTags.length === 0 || row.genreTags.length === 0,
  );
  const coursesWithResultContent = activeCourses.filter(
    (row) =>
      Boolean(row.description?.trim()) ||
      Boolean(row.photoMime) ||
      Boolean(row.youtubeVideoId?.trim()),
  );
  const campusesWithAccessInfo = activeCampuses.filter(
    (row) =>
      Boolean(row.address?.trim()) ||
      Boolean(row.access?.trim()) ||
      Boolean(row.googleMapUrl?.trim()) ||
      Boolean(row.googleMapEmbedUrl?.trim()),
  );
  const instructorsWithProfiles = activeInstructors.filter(
    (row) =>
      Boolean(row.photoMime) ||
      Boolean(row.charmTags?.trim()) ||
      Boolean(row.introduction?.trim()),
  );
  const activeSlotsWithCourse = activeScheduleSlots.filter((slot) =>
    slot.courses.some((course) => activeCourseIds.has(course.courseId)),
  );
  const scheduleSlotsWithoutActiveCourse =
    activeScheduleSlots.length - activeSlotsWithCourse.length;

  const fieldLabels = activeFields.map((field) => field.label);
  const hasNameField = fieldLabels.some((label) =>
    includesAny(label, ["おなまえ", "お名前", "氏名", "名前"]),
  );
  const hasEmailField = fieldLabels.some((label) =>
    includesAny(label, ["メール", "Mail", "E-mail", "Email"]),
  );
  const hasTelField = fieldLabels.some((label) =>
    includesAny(label, ["電話", "TEL", "tel"]),
  );
  const requiredFieldCount = activeFields.filter((field) => field.required).length;

  const [totalFaqs, activeFaqs] = data.faqCounts;
  const mediaByKey = new Map(data.mediaRows.map((row) => [row.key, row]));
  const hasBanner = Boolean(mediaByKey.get("campaign_banner")?.photoMime);
  const hasVideo = Boolean(mediaByKey.get("youtube_video")?.textData?.trim());
  const teacherOptionCount =
    QUESTIONS.find((question) => question.id === "Q5")?.options.length ?? 0;
  const coveredTeacherOptions = new Set(
    data.instructorOptionLinks
      .filter((link) => activeInstructorIds.has(link.instructorId))
      .map((link) => link.optionId),
  );
  const formContactReady = hasNameField && hasEmailField && hasTelField;
  const emailReady = Boolean(
    data.emailSetting?.isActive &&
      data.emailSetting.adminTo?.trim() &&
      data.emailSetting.fromEmail?.trim(),
  );

  const coreItems: DiagnosisReadinessItem[] = [
    {
      title: "校舎",
      status: getStatus(activeCampuses.length > 0),
      summary: `${activeCampuses.length}件 有効`,
      detail:
        activeCampuses.length > 0
          ? "Q1 の校舎選択肢として利用できます。"
          : "Q1 で選べる校舎がないため、診断結果を生成できません。",
      href: hrefWithSchoolId("/admin/diagnosis/campuses", schoolId),
      actionLabel: "校舎を確認",
    },
    {
      title: "コース",
      status: getStatus(activeCourses.length > 0),
      summary: `${activeCourses.length}件 有効`,
      detail:
        activeCourses.length > 0
          ? "Q2/Q4 の回答からおすすめコースを選ぶ候補になります。"
          : "おすすめコースの候補がないため、診断結果が弱くなります。",
      href: hrefWithSchoolId("/admin/diagnosis/courses", schoolId),
      actionLabel: "コースを確認",
    },
    {
      title: "ジャンル",
      status: getStatus(activeGenres.length > 0),
      summary: `${activeGenres.length}件 有効`,
      detail:
        activeGenres.length > 0
          ? "Q4 の選択肢として利用できます。"
          : "Q4 に表示するジャンルがありません。",
      href: hrefWithSchoolId("/admin/diagnosis/genres", schoolId),
      actionLabel: "ジャンルを確認",
    },
    {
      title: "年代・ライフスタイル",
      status: getStatus(activeLifestyles.length > 0),
      summary: `${activeLifestyles.length}件 有効`,
      detail:
        activeLifestyles.length > 0
          ? "Q3 の選択肢として利用できます。"
          : "Q3 に表示する年代・ライフスタイルがありません。",
      href: hrefWithSchoolId("/admin/diagnosis/lifestyles", schoolId),
      actionLabel: "年代を確認",
    },
    {
      title: "講師",
      status: getStatus(activeInstructors.length > 0),
      summary: `${activeInstructors.length}件 有効`,
      detail:
        activeInstructors.length > 0
          ? "診断結果でおすすめ講師として表示できます。"
          : "診断結果に表示できる講師がありません。",
      href: hrefWithSchoolId("/admin/diagnosis/instructors", schoolId),
      actionLabel: "講師を確認",
    },
  ];

  const matchingItems: DiagnosisReadinessItem[] = [
    {
      title: "コースの Q2/Q4 タグ",
      status: getStatus(activeCourses.length > 0, coursesMissingTags.length > 0),
      summary:
        activeCourses.length === 0
          ? "対象コースなし"
          : `${activeCourses.length - coursesMissingTags.length}/${activeCourses.length}件 設定済み`,
      detail:
        coursesMissingTags.length > 0
          ? `${coursesMissingTags.length}件の有効コースで、経験レベルまたはジャンルタグが不足しています。`
          : "有効コースに診断回答タグが設定されています。",
      href: hrefWithSchoolId("/admin/diagnosis/courses", schoolId),
      actionLabel: "タグを確認",
    },
    {
      title: "コースと講師の紐づけ",
      status: getStatus(
        activeCourses.length > 0 && coursesWithInstructors > 0,
        activeCourses.length > 0 && coursesWithInstructors < activeCourses.length,
      ),
      summary: formatRatio(coursesWithInstructors, activeCourses.length),
      detail:
        coursesWithInstructors === activeCourses.length && activeCourses.length > 0
          ? "すべての有効コースに講師が紐づいています。"
          : "講師が紐づいていない有効コースは、結果画面の講師推薦で不利になります。",
      href: hrefWithSchoolId("/admin/diagnosis/instructors", schoolId),
      actionLabel: "講師紐づけを確認",
    },
    {
      title: "校舎と講師の紐づけ",
      status: getStatus(
        activeCampuses.length > 0 && campusesWithInstructors > 0,
        activeCampuses.length > 0 &&
          campusesWithInstructors < activeCampuses.length,
      ),
      summary: formatRatio(campusesWithInstructors, activeCampuses.length),
      detail:
        campusesWithInstructors === activeCampuses.length &&
        activeCampuses.length > 0
          ? "すべての有効校舎に講師が紐づいています。"
          : "講師が紐づいていない校舎では、結果画面の講師推薦が出にくくなります。",
      href: hrefWithSchoolId("/admin/diagnosis/instructors", schoolId),
      actionLabel: "講師紐づけを確認",
    },
    {
      title: "講師側の紐づけ",
      status: getStatus(
        activeInstructors.length > 0 &&
          instructorsWithCourses > 0 &&
          instructorsWithCampuses > 0,
        activeInstructors.length > 0 &&
          (instructorsWithCourses < activeInstructors.length ||
            instructorsWithCampuses < activeInstructors.length),
      ),
      summary: `course ${formatRatio(
        instructorsWithCourses,
        activeInstructors.length,
      )} / campus ${formatRatio(instructorsWithCampuses, activeInstructors.length)}`,
      detail:
        "講師ごとに担当コースと担当校舎を入れると、推薦精度が安定します。",
      href: hrefWithSchoolId("/admin/diagnosis/instructors", schoolId),
      actionLabel: "講師を確認",
    },
    {
      title: "理想の先生タイプ",
      status: getStatus(
        activeInstructors.length > 0 && instructorsWithTeacherType > 0,
        activeInstructors.length > 0 &&
          (instructorsWithTeacherType < activeInstructors.length ||
            coveredTeacherOptions.size < teacherOptionCount),
      ),
      summary: `${instructorsWithTeacherType}/${activeInstructors.length}人 設定`,
      detail:
        coveredTeacherOptions.size < teacherOptionCount
          ? "Q5 の先生タイプに未カバーの選択肢があります。"
          : "Q5 の回答に応じた講師推薦に利用できます。",
      href: hrefWithSchoolId("/admin/diagnosis/instructors", schoolId),
      actionLabel: "先生タイプを確認",
    },
  ];

  const formItems: DiagnosisReadinessItem[] = [
    {
      title: "フォーム本体",
      status: getStatus(Boolean(data.form?.isActive && activeFields.length > 0)),
      summary: data.form?.isActive
        ? `${activeFields.length}件 有効フィールド`
        : "フォーム無効または未作成",
      detail:
        data.form?.isActive && activeFields.length > 0
          ? "診断結果から申込フォームを表示できます。"
          : "申込フォームが表示できないため、CV を受けられません。",
      href: hrefWithSchoolId("/admin/diagnosis/form", schoolId),
      actionLabel: "フォームを確認",
    },
    {
      title: "連絡先フィールド",
      status: getStatus(formContactReady, requiredFieldCount < 3),
      summary: `必須 ${requiredFieldCount}件`,
      detail: formContactReady
        ? "名前・メール・電話の入力欄を確認できました。"
        : "名前・メール・電話のいずれかが不足している可能性があります。",
      href: hrefWithSchoolId("/admin/diagnosis/form", schoolId),
      actionLabel: "項目を確認",
    },
    {
      title: "メール設定",
      status: getStatus(emailReady),
      summary: emailReady ? "送信先とFrom設定あり" : "送信設定不足",
      detail: emailReady
        ? "フォーム送信時の管理者通知に必要な設定があります。"
        : "adminTo / fromEmail / 有効状態を確認してください。",
      href: hrefWithSchoolId("/admin/diagnosis/form", schoolId),
      actionLabel: "メール設定を確認",
    },
  ];

  const contentItems: DiagnosisReadinessItem[] = [
    {
      title: "スケジュール",
      status: getStatus(
        activeSlotsWithCourse.length > 0,
        scheduleSlotsWithoutActiveCourse > 0,
      ),
      summary: `${activeSlotsWithCourse.length}枠 有効`,
      detail:
        scheduleSlotsWithoutActiveCourse > 0
          ? `${scheduleSlotsWithoutActiveCourse}枠で有効コースとの紐づけが不足しています。`
          : "体験クラスや日程表示に使えるスケジュールがあります。",
      href: hrefWithSchoolId("/admin/diagnosis/schedule", schoolId),
      actionLabel: "スケジュールを確認",
    },
    {
      title: "FAQ",
      status: getStatus(activeFaqs > 0, activeFaqs < Math.min(3, totalFaqs || 3)),
      summary: `${activeFaqs}件 表示中`,
      detail:
        activeFaqs > 0
          ? "診断結果ページ等で補足情報として表示できます。"
          : "よくある質問を入れると、申込前の不安を減らせます。",
      href: hrefWithSchoolId("/admin/diagnosis/faqs", schoolId),
      actionLabel: "FAQを確認",
    },
    {
      title: "校舎アクセス情報",
      status: getStatus(
        activeCampuses.length > 0,
        activeCampuses.length > 0 &&
          campusesWithAccessInfo.length < activeCampuses.length,
      ),
      summary: formatRatio(campusesWithAccessInfo.length, activeCampuses.length),
      detail:
        "住所・アクセス・Google Map があると、結果画面から体験まで進みやすくなります。",
      href: hrefWithSchoolId("/admin/diagnosis/campuses", schoolId),
      actionLabel: "校舎情報を確認",
    },
    {
      title: "結果表示用コンテンツ",
      status: getStatus(
        activeCourses.length > 0,
        activeCourses.length > 0 &&
          (coursesWithResultContent.length < activeCourses.length ||
            instructorsWithProfiles.length < activeInstructors.length),
      ),
      summary: `course ${formatRatio(
        coursesWithResultContent.length,
        activeCourses.length,
      )} / teacher ${formatRatio(instructorsWithProfiles.length, activeInstructors.length)}`,
      detail:
        "コース説明・画像/動画・講師紹介を入れると、結果画面の説得力が上がります。",
      href: hrefWithSchoolId("/admin/diagnosis/courses", schoolId),
      actionLabel: "表示内容を確認",
    },
    {
      title: "バナー・紹介動画",
      status: hasBanner || hasVideo ? (hasBanner && hasVideo ? "ok" : "warn") : "warn",
      summary: `${hasBanner ? "バナーあり" : "バナーなし"} / ${
        hasVideo ? "動画あり" : "動画なし"
      }`,
      detail:
        "未設定でも診断は動きます。キャンペーン訴求や安心材料として追加できます。",
      href: hrefWithSchoolId("/admin/diagnosis/media", schoolId),
      actionLabel: "画像・動画を確認",
    },
  ];

  const groups: DiagnosisReadinessGroup[] = [
    {
      title: "必須設定",
      description: "診断フォームと結果生成に必要な基礎データです。",
      items: coreItems,
    },
    {
      title: "診断精度",
      description: "回答からコース・講師を正しく推薦するための紐づけです。",
      items: matchingItems,
    },
    {
      title: "申込フォーム",
      description: "体験予約の送信とメール通知に必要な設定です。",
      items: formItems,
    },
    {
      title: "表示コンテンツ",
      description: "結果画面の説得力と申込率を上げる推奨設定です。",
      items: contentItems,
    },
  ];

  const allItems = groups.flatMap((group) => group.items);
  const blockingCount = allItems.filter((item) => item.status === "missing").length;
  const warnCount = allItems.filter((item) => item.status === "warn").length;
  const okCount = allItems.filter((item) => item.status === "ok").length;
  const totalCount = allItems.length;
  const completionPercent = Math.round((okCount / totalCount) * 100);
  const status: DiagnosisReadinessStatus =
    blockingCount > 0 ? "missing" : warnCount > 0 ? "warn" : "ok";
  const statusLabel =
    blockingCount > 0
      ? `${blockingCount}件 未設定`
      : warnCount > 0
        ? `${warnCount}件 要確認`
        : "すべてOK";
  const activeDataLabel = `${activeCampuses.length}/${activeCourses.length}/${activeInstructors.length}`;

  const stats: DiagnosisReadinessStat[] = [
    {
      label: "完成度",
      value: `${completionPercent}%`,
      caption: `${okCount}/${totalCount}項目 OK`,
    },
    {
      label: "未設定",
      value: `${blockingCount}`,
      caption: "先に対応したい項目",
    },
    {
      label: "要確認",
      value: `${warnCount}`,
      caption: "精度・CV改善の余地",
    },
    {
      label: "有効データ",
      value: activeDataLabel,
      caption: "校舎 / コース / 講師",
    },
  ];

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
    stats,
    groups,
  };
}
