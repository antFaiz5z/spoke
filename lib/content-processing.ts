import type { StructuredContent } from "@/lib/types/content";

const META_LABELS = new Set([
  "situation",
  "goal",
  "context",
  "task",
  "note",
  "notes",
  "instruction",
  "instructions",
]);

export function normalizeText(input: string): string {
  return input.replace(/\r\n/g, "\n").trim();
}

const SENTENCE_PATTERN = /[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g;
const TOKEN_PATTERN = /[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu;

function parseParagraphPrefix(paragraphText: string) {
  const match = paragraphText.match(/^\(?\s*([A-Za-z][A-Za-z0-9'()\- ]{0,40})\s*[:：]\s*(.+?)\)?$/s);

  if (!match) {
    return {
      paragraphType: "spoken" as const,
      metaLabel: null,
      speakerId: null,
      speakerLabel: null,
      contentText: paragraphText,
      contentOffset: 0,
    };
  }

  const label = match[1].trim();
  const contentText = match[2].trim();
  const contentOffset = paragraphText.indexOf(contentText);
  const normalizedLabel = label.toLowerCase();

  if (META_LABELS.has(normalizedLabel)) {
    return {
      paragraphType: "meta" as const,
      metaLabel: label,
      speakerId: null,
      speakerLabel: null,
      contentText,
      contentOffset: contentOffset >= 0 ? contentOffset : 0,
    };
  }

  return {
    paragraphType: "spoken" as const,
    metaLabel: null,
    speakerId: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    speakerLabel: label,
    contentText,
    contentOffset: contentOffset >= 0 ? contentOffset : 0,
  };
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

    const { paragraphType, metaLabel, speakerId, speakerLabel, contentText, contentOffset } =
      parseParagraphPrefix(paragraphText);
    const paragraphContentStart = paragraphStart + contentOffset;
    const sentenceMatches = Array.from(contentText.matchAll(SENTENCE_PATTERN));
    const sentences = (sentenceMatches.length > 0
      ? sentenceMatches
      : [{ 0: contentText, index: 0 }] as Array<{ 0: string; index?: number }>)
      .map((match, sentenceIndex) => {
        const sentenceText = match[0].trim();
        const localSentenceStart = contentText.indexOf(sentenceText, match.index ?? 0);
        const sentenceStart = paragraphContentStart + Math.max(localSentenceStart, 0);
        const sentenceEnd = sentenceStart + sentenceText.length;
        const tokenMatches = Array.from(sentenceText.matchAll(TOKEN_PATTERN));
        const tokens = tokenMatches.map((tokenMatch, tokenIndex) => {
          const tokenText = tokenMatch[0];
          const tokenStart = sentenceStart + (tokenMatch.index ?? 0);
          const tokenEnd = tokenStart + tokenText.length;

          return {
            id: `t${paragraphIndex + 1}_${sentenceIndex + 1}_${tokenIndex + 1}`,
            index: tokenIndex,
            text: tokenText,
            normalizedText: tokenText.toLowerCase(),
            isPunctuation: /^[^\p{L}\p{N}]+$/u.test(tokenText),
            startOffset: tokenStart,
            endOffset: tokenEnd,
          };
        });

        return {
          id: `s${paragraphIndex + 1}_${sentenceIndex + 1}`,
          index: sentenceIndex,
          text: sentenceText,
          startOffset: sentenceStart,
          endOffset: sentenceEnd,
          tokens,
        };
      });

    return {
      id: `p${paragraphIndex + 1}`,
      index: paragraphIndex,
      paragraphType,
      metaLabel,
      speakerId,
      speakerLabel,
      text: contentText,
      startOffset: paragraphContentStart,
      endOffset: paragraphContentStart + contentText.length,
      sentences,
    };
  });

  return {
    version: 1,
    paragraphs,
  };
}
