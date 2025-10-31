import { FAQDocument, FAQItem } from "./types";

export function validateFAQ(items: FAQItem) {
  const errors = {
    emptyQuestion: 0,
    emptyAnswer: 0,
    unlabeledOption: 0,
    invalidUrl: 0,
  };

  const walk = (item: FAQItem) => {
    if (!item) return;
    if (!item.question?.trim()) errors.emptyQuestion++;

    if (item.type === "question") {
      if (!item.answer?.trim()) errors.emptyAnswer++;
      if ((item as any).url && !/^https?:\/\//i.test((item as any).url))
        errors.invalidUrl++;
      return;
    }
    // select
    if (!Array.isArray(item.options) || item.options.length === 0)
      errors.unlabeledOption++;
    item.options?.forEach((opt) => {
      if (!opt.label?.trim()) errors.unlabeledOption++;
      walk(opt.next);
    });
  };

  walk(items);
  return errors;
}

export function isValidFAQ(doc: FAQDocument) {
  if (!doc?.school || !doc?.root) return false;
  const e = validateFAQ(doc.root);
  return Object.values(e).every((v) => v === 0);
}
