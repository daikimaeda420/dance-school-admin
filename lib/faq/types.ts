export type FaqLog = {
  sessionId?: string;
  timestamp: string;
  question: any;
  answer?: any;
  url?: string;
};

export type FAQQuestion = {
  type: "question";
  question: string;
  answer: string;
  url?: string;
};

export type FAQSelect = {
  type: "select";
  question: string;
  answer?: string;
  options: { label: string; next: FAQItem }[];
};

export type FAQItem = FAQQuestion | FAQSelect;

export type FAQDocument = {
  school: string; // 例: "daiki.maeda.web"
  version: number; // エディタの保存ごとに +1
  updatedAt: string; // ISO
  root: FAQItem; // チャット開始時のルート
};
