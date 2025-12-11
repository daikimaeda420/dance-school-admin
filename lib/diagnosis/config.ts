// lib/diagnosis/config.ts

// Q5（今回は Q6）で使う不安メッセージのキー
export type ConcernMessageKey =
  | "Msg_Pace"
  | "Msg_Atmosphere"
  | "Msg_Sense"
  | "Msg_LevelUp"
  | "Msg_Consult";

// 各選択肢
export type DiagnosisQuestionOption = {
  id: string; // 例: "1-1"
  label: string; // 表示テキスト
  tag?: string; // 判定用タグ（エリア以外のQで使用）
  messageKey?: ConcernMessageKey; // 不安質問専用（Q6）
  isOnline?: boolean; // オンライン校舎かどうか（Q1向け）
};

// 質問定義
export type DiagnosisQuestionId = "Q1" | "Q2" | "Q3" | "Q4" | "Q5" | "Q6";

export type DiagnosisQuestion = {
  id: DiagnosisQuestionId;
  title: string;
  description?: string;
  // Q1: area / Q2: level / Q3: age / Q4: genre / Q5: teacher / Q6: concern
  key: "area" | "level" | "age" | "genre" | "teacher" | "concern";
  options: DiagnosisQuestionOption[];
};

// レベル判定用の並び順
export const LEVEL_ORDER = [
  "Lv0_超入門",
  "Lv1_入門",
  "Lv2_初級",
  "Lv3_初中級",
  "Lv4_中上級",
] as const;

// 質問一覧（Q1〜Q6）
export const QUESTIONS: DiagnosisQuestion[] = [
  // -------------------
  // Q1: エリア・校舎
  // -------------------
  {
    id: "Q1",
    title: "最も通いやすい「エリア・校舎」は？",
    description: "（継続するためには「通いやすさ」が一番大切です！）",
    key: "area",
    options: [
      { id: "shibuya", label: "渋谷校" },
      { id: "shinjuku", label: "新宿校" },
      { id: "ikebukuro", label: "池袋校" },
      {
        id: "online",
        label: "【オンライン】自宅で受講",
        isOnline: true,
      },
    ],
  },

  // -------------------
  // Q2: レベル質問（元Q1）
  // -------------------
  {
    id: "Q2",
    title: "Q2. 経験・運動レベル",
    description: "今の自分に一番近いものを選んでください。",
    key: "level",
    options: [
      {
        id: "2-1",
        label: "運動自体がニガテ…リズム感にも自信がない",
        tag: "Lv0_超入門",
      },
      {
        id: "2-2",
        label: "運動は普通にできるけど、ダンスは未経験",
        tag: "Lv1_入門",
      },
      {
        id: "2-3",
        label: "昔少し習っていた / 学校の体育でやった程度",
        tag: "Lv2_初級",
      },
      {
        id: "2-4",
        label: "基本的なステップなら踊れる（初級レベル）",
        tag: "Lv3_初中級",
      },
      {
        id: "2-5",
        label: "本格的に習った経験がある / バリバリ踊りたい",
        tag: "Lv4_中上級",
      },
    ],
  },

  // -------------------
  // Q3: 年代・ライフスタイル（元Q2）
  // -------------------
  {
    id: "Q3",
    title: "Q3. 年代・ライフスタイル",
    description: "通う人の年代に近いものを選んでください。",
    key: "age",
    options: [
      { id: "3-1", label: "未就学児（3歳〜6歳くらい）", tag: "Age_Kids" },
      { id: "3-2", label: "小学生（キッズ）", tag: "Age_Elementary" },
      { id: "3-3", label: "中学生・高校生", tag: "Age_Teen" },
      { id: "3-4", label: "大学生・専門学生", tag: "Age_Student" },
      {
        id: "3-5",
        label: "社会人（お仕事をしている方）",
        tag: "Age_Adult_Work",
      },
      {
        id: "3-6",
        label: "主婦・主夫（日中の時間を活用）",
        tag: "Age_Adult_Day",
      },
    ],
  },

  // -------------------
  // Q4: 好みの音楽・雰囲気（元Q3）
  // -------------------
  {
    id: "Q4",
    title: "Q4. 好みの音楽・雰囲気",
    description: "一番「踊ってみたい！」と思うものを選んでください。",
    key: "genre",
    options: [
      { id: "4-1", label: "K-POP・流行りの曲", tag: "Genre_KPOP" },
      { id: "4-2", label: "重低音の効いたカッコいい洋楽", tag: "Genre_HIPHOP" },
      { id: "4-3", label: "オシャレでゆったりした曲", tag: "Genre_JAZZ" },
      { id: "4-4", label: "とにかく明るく楽しい曲", tag: "Genre_ThemePark" },
      { id: "4-5", label: "まだ迷っている・色々見てみたい", tag: "Genre_All" },
    ],
  },

  // -------------------
  // Q5: 理想の先生（元Q4）
  // -------------------
  {
    id: "Q5",
    title: "Q5. 理想の先生",
    description: "どんな先生だと続けやすそうですか？",
    key: "teacher",
    options: [
      {
        id: "5-1",
        label: "とにかく優しく！褒めて伸ばしてほしい",
        tag: "Style_Healing", // 癒し
      },
      {
        id: "5-2",
        label: "プロ志望！厳しくても本格的に指導してほしい",
        tag: "Style_Hard", // ガチ
      },
      {
        id: "5-3",
        label: "実績のあるベテラン講師に、基礎から丁寧に習いたい",
        tag: "Style_Logical", // 論理
      },
      {
        id: "5-4",
        label: "先生というより「友達」みたいに接してほしい",
        tag: "Style_Friendly", // 友達
      },
    ],
  },

  // -------------------
  // Q6: 一番の不安（元Q5）
  // -------------------
  {
    id: "Q6",
    title: "Q6. 一番の不安",
    description: "正直な気持ちに一番近いものを選んでください。",
    key: "concern",
    options: [
      {
        id: "6-1",
        label: "周りのペースについていけるか",
        messageKey: "Msg_Pace",
      },
      {
        id: "6-2",
        label: "教室の雰囲気に馴染めるか",
        messageKey: "Msg_Atmosphere",
      },
      {
        id: "6-3",
        label: "リズム感・運動神経に自信がない",
        messageKey: "Msg_Sense",
      },
      {
        id: "6-4",
        label: "しっかり上達できるか・レベルが低すぎないか",
        messageKey: "Msg_LevelUp",
      },
      {
        id: "6-5",
        label: "まだ勇気が出ない・色々不安",
        messageKey: "Msg_Consult",
      },
    ],
  },
];

// 不安解消メッセージ（Q6の messageKey に対応）
export const concernMessages: Record<ConcernMessageKey, string> = {
  Msg_Pace:
    "LINKsでは最大8名までの少人数制なので、周りのペースについていけない…という不安を感じにくい環境です。振付もゆっくり丁寧に進めるので、マイペースに通えます。",
  Msg_Atmosphere:
    "体験レッスンでは、クラスの雰囲気や生徒さんの年齢層もチェックできます。「合わないかも…」と感じた場合は、クラス変更のご相談も可能なのでご安心ください。",
  Msg_Sense:
    "リズム感や運動神経よりも大切なのは“慣れ”です。基礎から少しずつ積み上げていくカリキュラムなので、今の段階で自信がなくても全く問題ありません。",
  Msg_LevelUp:
    "上達したい方向けに、レベル別クラスやステップアップ用のクラスもご用意しています。物足りなくなった場合は、次のクラスへのご案内も可能です。",
  Msg_Consult:
    "いきなり申込むのが不安な方は、まずは体験レッスンで雰囲気を見ていただくのがおすすめです。スタッフが目的や不安をヒアリングしながら、最適なクラスをご提案します。",
};
