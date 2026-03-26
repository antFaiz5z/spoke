import type { StructuredContent } from "@/lib/types/content";

export function normalizeText(input: string): string {
  return input.replace(/\r\n/g, "\n").trim();
}

export function buildStructuredContent(text: string): StructuredContent {
  const paragraphTexts = text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  let offset = 0;

  const paragraphs = paragraphTexts.map((paragraphText, paragraphIndex) => {
    const paragraphStart = text.indexOf(paragraphText, offset);
    const paragraphEnd = paragraphStart + paragraphText.length;
    offset = paragraphEnd;

    const sentenceText = paragraphText;
    const sentenceStart = paragraphStart;
    const sentenceEnd = paragraphEnd;

    const tokens = sentenceText.split(/\s+/).flatMap((tokenText, tokenIndex, arr) => {
      const localStart =
        tokenIndex === 0
          ? 0
          : arr.slice(0, tokenIndex).join(" ").length + 1;
      const tokenStart = sentenceStart + localStart;
      const tokenEnd = tokenStart + tokenText.length;

      return [
        {
          id: `t${paragraphIndex + 1}_${tokenIndex + 1}`,
          index: tokenIndex,
          text: tokenText,
          normalizedText: tokenText.toLowerCase(),
          isPunctuation: /^[^\p{L}\p{N}]+$/u.test(tokenText),
          startOffset: tokenStart,
          endOffset: tokenEnd,
        },
      ];
    });

    return {
      id: `p${paragraphIndex + 1}`,
      index: paragraphIndex,
      speakerId: null,
      speakerLabel: null,
      text: paragraphText,
      startOffset: paragraphStart,
      endOffset: paragraphEnd,
      sentences: [
        {
          id: `s${paragraphIndex + 1}_1`,
          index: 0,
          text: sentenceText,
          startOffset: sentenceStart,
          endOffset: sentenceEnd,
          tokens,
        },
      ],
    };
  });

  return {
    version: 1,
    paragraphs,
  };
}
