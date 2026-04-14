import type { TranslationBundle } from "@/lib/types/content";

export function buildSentenceTranslationIndex(
  translationBundle: TranslationBundle | null | undefined,
): Map<string, string> {
  if (!translationBundle) {
    return new Map();
  }

  return new Map(
    translationBundle.sentenceTranslations
      .filter((item) => item.sentenceId && item.text.trim())
      .map((item) => [item.sentenceId, item.text]),
  );
}
